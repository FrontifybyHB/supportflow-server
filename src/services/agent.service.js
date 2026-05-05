import bcrypt from "bcrypt";

import { AUTH_PROVIDERS, OTP_PURPOSES, ROLES } from "../constants/constants.js";
import otpRepository from "../repositories/otp.repository.js";
import userRepository from "../repositories/user.repository.js";
import { enqueueOtpEmail } from "../queues/email.queue.js";
import appError from "../utils/appError.js";
import { generateOtp, getOtpExpiresAt } from "../utils/otp.js";

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_HASH_ROUNDS = 10;
const AGENT_EMAIL_IN_OTHER_BUSINESS = "AGENT_EMAIL_IN_OTHER_BUSINESS";

const toAgentResponse = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
});

class AgentService {
    constructor({
        userRepo = userRepository,
        otpRepo = otpRepository,
        enqueueOtp = enqueueOtpEmail,
    } = {}) {
        this.userRepo = userRepo;
        this.otpRepo = otpRepo;
        this.enqueueOtp = enqueueOtp;
    }

    async createAgent({ name, email, password }, businessId) {
        const normalizedEmail = email.toLowerCase();
        const existing = await this.userRepo.findByEmailWithPassword(normalizedEmail);

        if (existing?.businessId && existing.businessId.toString() !== businessId.toString()) {
            const error = appError(
                "This email is already used by an account in another business. Use a different email address.",
                409
            );
            error.code = AGENT_EMAIL_IN_OTHER_BUSINESS;
            throw error;
        }

        if (existing?.role === ROLES.SUPERADMIN) {
            throw appError("Cannot assign a superadmin as an agent", 400);
        }

        if (existing) {
            const setFields = {
                name: name || existing.name,
                businessId,
                role: ROLES.AGENT,
                isActive: true,
                isEmailVerified: false,
            };

            const update = { $set: setFields };
            if (!existing.passwordHash && password) {
                setFields.passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
                update.$addToSet = { authProviders: AUTH_PROVIDERS.PASSWORD };
            }

            const updated = await this.userRepo.updateById(existing._id, update);
            await this.createAndQueueVerificationOtp(updated);
            return toAgentResponse(updated);
        }

        const created = await this.userRepo.create({
            name,
            email: normalizedEmail,
            passwordHash: await bcrypt.hash(password, PASSWORD_SALT_ROUNDS),
            role: ROLES.AGENT,
            businessId,
            isActive: true,
            isEmailVerified: false,
            authProviders: [AUTH_PROVIDERS.PASSWORD],
        });

        await this.createAndQueueVerificationOtp(created);
        return toAgentResponse(created);
    }

    async listAgents(businessId, query = {}) {
        let isActive;
        if (query.isActive !== undefined) {
            isActive = query.isActive === true || query.isActive === "true";
        }

        return this.userRepo.paginateByBusinessAndRole({
            businessId,
            role: ROLES.AGENT,
            isActive,
            page: query.page,
            limit: query.limit,
        });
    }

    async updateAgent(agentId, businessId, updates) {
        const agent = await this.userRepo.updateScopedByRole(
            agentId,
            businessId,
            ROLES.AGENT,
            updates
        );

        if (!agent) {
            throw appError("Agent not found", 404);
        }

        return agent;
    }

    async createAndQueueVerificationOtp(user) {
        await this.otpRepo.markPreviousAsUsed(user._id, OTP_PURPOSES.EMAIL_VERIFICATION);

        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, TOKEN_HASH_ROUNDS);

        await this.otpRepo.create({
            userId: user._id,
            otpHash,
            purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
            expiresAt: getOtpExpiresAt(),
        });

        return this.enqueueOtp({
            to: user.email,
            otp,
            purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
        });
    }
}

const agentService = new AgentService();
export default agentService;
export { AgentService };
