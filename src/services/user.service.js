import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";

import appError from "../utils/appError.js";
import config from "../config/config.js";
import { AUTH_PROVIDERS, OTP_PURPOSES, ROLES } from "../constants/constants.js";
import businessRepository from "../repositories/business.repository.js";
import otpRepository from "../repositories/otp.repository.js";
import sessionRepository from "../repositories/session.repository.js";
import userRepository from "../repositories/user.repository.js";
import { enqueueOtpEmail } from "../queues/email.queue.js";
import { generateOtp, getOtpExpiresAt } from "../utils/otp.js";
import {
    generateAccessToken,
    generateRefreshToken,
    getRefreshTokenExpiresAt,
    verifyRefreshToken,
} from "../utils/tokens.js";

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_HASH_ROUNDS = 10;
const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

const normalizeEmail = (email) => email?.trim().toLowerCase();
const includeDeliveryDebug = () => config.NODE_ENV !== "production";

const summarizeOtpDelivery = (delivery) => {
    if (!delivery) return { status: "unknown" };
    if (delivery.error) return { status: "failed", error: delivery.error };
    if (delivery.queued) return { status: "queued", jobId: delivery.jobId };
    if (delivery.email?.skipped) return { status: "skipped", reason: "smtp_not_configured" };
    if (delivery.email?.rejected?.length) {
        return { status: "rejected", rejected: delivery.email.rejected };
    }
    if (delivery.email?.messageId || delivery.email?.accepted?.length) {
        return {
            status: "sent",
            messageId: delivery.email.messageId,
            accepted: delivery.email.accepted,
        };
    }
    return { status: "unknown" };
};

const toSafeUser = (user) => {
    const source = user?.toObject ? user.toObject() : user;
    if (!source) return null;

    delete source.passwordHash;
    delete source.__v;
    return source;
};

class UserService {
    constructor({
        userRepo = userRepository,
        otpRepo = otpRepository,
        sessionRepo = sessionRepository,
        businessRepo = businessRepository,
    } = {}) {
        this.userRepo = userRepo;
        this.otpRepo = otpRepo;
        this.sessionRepo = sessionRepo;
        this.businessRepo = businessRepo;
    }

    async register({ name, email, password }, request) {
        const normalizedEmail = normalizeEmail(email);
        const existingUser = await this.userRepo.existsByEmail(normalizedEmail);

        if (existingUser) {
            throw appError("Email already registered", 400);
        }

        const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

        const user = await this.userRepo.create({
            name,
            email: normalizedEmail,
            passwordHash,
            role: ROLES.CUSTOMER,
            authProviders: [AUTH_PROVIDERS.PASSWORD],
            isEmailVerified: false,
        });

        const delivery = await this.createAndQueueOtp(user, OTP_PURPOSES.EMAIL_VERIFICATION);
        const { refreshToken } = await this.createRefreshSession(user._id, request);

        return {
            refreshToken,
            user: toSafeUser(user),
            message: "Registration successful. Verification OTP queued.",
            ...(includeDeliveryDebug() && { otpDelivery: summarizeOtpDelivery(delivery) }),
        };
    }

    async login(email, password, request) {
        const user = await this.userRepo.findByEmailWithPassword(normalizeEmail(email));

        if (!user || !user.passwordHash) {
            throw appError("Invalid email or password", 401);
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            throw appError("Invalid email or password", 401);
        }

        if (!user.isActive) {
            throw appError("Account is deactivated", 403);
        }

        if (!user.isEmailVerified) {
            const delivery = await this.createAndQueueOtp(user, OTP_PURPOSES.EMAIL_VERIFICATION);
            return {
                needsVerification: true,
                userId: user._id,
                message: "Please verify your email. A new OTP has been queued.",
                ...(includeDeliveryDebug() && { otpDelivery: summarizeOtpDelivery(delivery) }),
            };
        }

        return this.issueAuthTokens(user, request);
    }

    async googleLogin({ idToken, businessName }, request) {
        if (!config.GOOGLE_CLIENT_ID) {
            throw appError("Google login is not configured", 503);
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: config.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload?.email || !payload.email_verified) {
            throw appError("Google account email is not verified", 401);
        }

        const email = normalizeEmail(payload.email);
        const existing = await this.userRepo.findByEmail(email);

        let user;
        if (existing) {
            const setFields = { isEmailVerified: true };
            if (payload.picture) setFields.avatarUrl = payload.picture;
            if (!existing.googleId) setFields.googleId = payload.sub;

            user = await this.userRepo.updateById(existing._id, {
                $set: setFields,
                $addToSet: { authProviders: AUTH_PROVIDERS.GOOGLE },
            });
        } else {
            const created = await this.userRepo.create({
                name: payload.name || email.split("@")[0],
                email,
                googleId: payload.sub,
                avatarUrl: payload.picture || "",
                role: ROLES.CUSTOMER,
                authProviders: [AUTH_PROVIDERS.GOOGLE],
                isEmailVerified: true,
            });
            user = created.toObject();
        }

        if (businessName && !user.businessId) {
            user = await this.createBusinessForUser(user._id, { businessName });
        }

        return this.issueAuthTokens(user, request);
    }

    async refreshAccessToken(refreshToken, request) {
        if (!refreshToken) {
            throw appError("Refresh token is required", 401);
        }

        const decoded = verifyRefreshToken(refreshToken);
        const session = await this.sessionRepo.findByUserAndSessionWithHash(
            decoded.userId,
            decoded.sessionId
        );

        if (!session) {
            throw appError("Invalid or expired refresh token", 401);
        }

        const tokenMatches = await bcrypt.compare(refreshToken, session.refreshTokenHash);

        if (!tokenMatches) {
            await this.sessionRepo.deleteById(session._id);
            throw appError("Refresh token reuse detected", 401);
        }

        const user = await this.userRepo.findById(decoded.userId);
        if (!user || !user.isActive) {
            await this.sessionRepo.deleteById(session._id);
            throw appError("Account is inactive", 401);
        }

        await this.sessionRepo.deleteById(session._id);
        const { refreshToken: newRefreshToken } = await this.createRefreshSession(user._id, request);
        const accessToken = generateAccessToken(user);

        return {
            accessToken,
            refreshToken: newRefreshToken,
            user: toSafeUser(user),
        };
    }

    async verifyOtp({ userId, otp, purpose = OTP_PURPOSES.EMAIL_VERIFICATION }, request) {
        const otpDoc = await this.otpRepo.findLatestUnusedWithHash(userId, purpose);

        if (!otpDoc || otpDoc.expiresAt < new Date()) {
            throw appError("OTP expired or not found", 400);
        }

        const otpMatches = await bcrypt.compare(otp, otpDoc.otpHash);
        if (!otpMatches) {
            throw appError("Invalid OTP", 400);
        }

        await this.otpRepo.markUsedById(otpDoc._id);

        if (purpose === OTP_PURPOSES.EMAIL_VERIFICATION) {
            const user = await this.userRepo.updateById(userId, { isEmailVerified: true });
            return this.issueAuthTokens(user, request);
        }

        return { message: "OTP verified" };
    }

    async resendOtp(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw appError("User not found", 404);
        }

        const delivery = await this.createAndQueueOtp(user, OTP_PURPOSES.EMAIL_VERIFICATION);
        return {
            message: "New verification OTP queued",
            ...(includeDeliveryDebug() && { otpDelivery: summarizeOtpDelivery(delivery) }),
        };
    }

    async forgotPassword(email) {
        const user = await this.userRepo.findByEmail(normalizeEmail(email));
        let delivery = null;

        if (user) {
            delivery = await this.createAndQueueOtp(user, OTP_PURPOSES.PASSWORD_RESET);
        }

        return {
            message: "If this email exists, a reset OTP has been queued",
            ...(includeDeliveryDebug() && {
                otpDelivery: user ? summarizeOtpDelivery(delivery) : { status: "no_matching_user" },
            }),
        };
    }

    async resetPassword({ userId, otp, newPassword }) {
        await this.verifyOtp({
            userId,
            otp,
            purpose: OTP_PURPOSES.PASSWORD_RESET,
        });

        const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
        await this.userRepo.updateById(userId, {
            passwordHash,
            $addToSet: { authProviders: AUTH_PROVIDERS.PASSWORD },
        });
        await this.sessionRepo.deleteAllForUser(userId);

        return { message: "Password reset successful. Please log in again." };
    }

    async logout(refreshToken) {
        if (refreshToken) {
            try {
                const decoded = verifyRefreshToken(refreshToken);
                await this.sessionRepo.deleteByUserAndSession(
                    decoded.userId,
                    decoded.sessionId
                );
            } catch {
                // Logout should still clear the browser cookie for invalid tokens.
            }
        }

        return { message: "Logged out successfully" };
    }

    async logoutAll(userId) {
        await this.sessionRepo.deleteAllForUser(userId);
        return { message: "Logged out from all devices" };
    }

    async getMe(userId) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw appError("User not found", 404);
        }
        return user;
    }

    async createBusinessForUser(userId, { name, businessName, industry = "", description = "" }) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw appError("User not found", 404);
        }

        if (user.businessId) {
            throw appError("User already belongs to a business", 400);
        }

        const business = await this.businessRepo.create({
            name: name || businessName,
            industry,
            description,
            ownerId: user._id,
        });

        return this.userRepo.updateById(userId, {
            businessId: business._id,
            role: ROLES.ADMIN,
        });
    }

    async createAndQueueOtp(user, purpose) {
        await this.otpRepo.markPreviousAsUsed(user._id, purpose);

        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, TOKEN_HASH_ROUNDS);

        await this.otpRepo.create({
            userId: user._id,
            otpHash,
            purpose,
            expiresAt: getOtpExpiresAt(),
        });

        return enqueueOtpEmail({
            to: user.email,
            otp,
            purpose,
        });
    }

    async createRefreshSession(userId, request = {}) {
        const { token, sessionId } = generateRefreshToken(userId);
        const refreshTokenHash = await bcrypt.hash(token, TOKEN_HASH_ROUNDS);

        await this.sessionRepo.create({
            userId,
            sessionId,
            refreshTokenHash,
            userAgent: request.get?.("user-agent") || request.headers?.["user-agent"] || "",
            ipAddress: request.ip || "",
            expiresAt: getRefreshTokenExpiresAt(),
        });

        return {
            refreshToken: token,
            sessionId,
        };
    }

    async issueAuthTokens(user, request) {
        const accessToken = generateAccessToken(user);
        const { refreshToken } = await this.createRefreshSession(user._id, request);

        return {
            accessToken,
            refreshToken,
            user: toSafeUser(user),
        };
    }
}

const userService = new UserService();
export default userService;
