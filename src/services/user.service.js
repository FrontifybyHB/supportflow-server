import jwt from "jsonwebtoken";
import appError from '../utils/appError.js';
import config from "../config/config.js";
import {hashPassword, comparePassword} from '../utils/password.js'
import * as CONSTANT from "../constants/constants.js";
import logger from "../loggers/winston.logger.js";
import UserRepository from "../repositories/user.repository.js";

/**
 * User Service
 * ------------
 * Business logic only
 * Function-based
 * Beginner + Production ready
 */

class UserService {
    constructor(userRepository = new UserRepository()) {
        this.userRepository = userRepository;
    }

    /**
     * Register new user
     */
    async register(userData) {
        delete userData.role;

        const emailExists = await this.userRepository.findByEmail(userData.email);
        if (emailExists) {
            throw appError("Email already registered", 400);
        }

        const usernameExists = await this.userRepository.findByUsername(userData.username);
        if (usernameExists) {
            throw appError("Username already taken", 400);
        }

        const hashedPassword = await hashPassword(userData.password);

        const user = await this.userRepository.create({
            username: userData.username,
            email: userData.email,
            password: hashedPassword,
            name: userData.name,
            role: "user",
            isEmailVerified: false
        });

        user.password = undefined;
        return user;
    }

    /**
     * Login user
     */
    async login(email, password) {
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            throw appError("Invalid email or password", 401);
        }

        if (user.isActive === false) {
            throw appError("Account deactivated", 401);
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            throw appError("Invalid email or password", 401);
        }

        user.password = undefined;
        return user;
    }

    /**
     * Get logged-in user
     */
    async getMe(userId) {
        return this.userRepository.findById(userId);
    }

    /**
     * Generate access token
     */
    generateAccessToken({ userId, username, email }) {
        return jwt.sign(
            { type: "access", id: userId, username, email },
            config.JWT_ACCESS_SECRET,
            { expiresIn: config.JWT_ACCESS_EXPIRY || CONSTANT.ACCESS_TOKEN_EXPIRATION }
        );
    }

    /**
     * Generate refresh token (stateless)
     */
    generateRefreshToken({ userId }) {
        return jwt.sign(
            { type: "refresh", userId, id: userId },
            config.JWT_REFRESH_SECRET,
            { expiresIn: config.JWT_REFRESH_EXPIRY || CONSTANT.REFRESH_TOKEN_EXPIRATION }
        );
    }

    /**
     * Verify refresh token (stateless)
     */
    verifyRefreshToken(refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
            if (decoded.type !== "refresh") {
                throw appError("Invalid refresh token", 401);
            }
            return decoded;
        } catch (error) {
            logger.warn("Refresh token verification failed", {
                error: error.message,
            });
            throw appError("Invalid or expired refresh token", 401);
        }
    }

    /**
     * Reset password
     */
    async resetPassword(userId, newPassword) {
        const user = await this.userRepository.findById(userId);
        if (!user) throw appError("User not found", 404);

        user.password = await hashPassword(newPassword);
        await user.save(); // triggers hashing
        return true;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, updates) {
        if (updates.password) {
            throw appError("Password update not allowed here", 400);
        }

        return this.userRepository.updateById(userId, updates);
    }

    /**
     * Generate email verification token
     */
    async generateVerificationToken(email) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) throw appError("User not found", 404);

        const token = jwt.sign(
            { id: user._id },
            config.JWT_ACCESS_SECRET,
            { expiresIn: CONSTANT.VERIFICATION_TOKEN_EXPIRATION }
        );

        user.emailVerificationToken = token;
        await user.save();

        return token;
    }

    /**
     * Verify email
     */
    async verifyEmail(token) {
        try {
            const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
            const user = await this.userRepository.findByIdWithEmailVerificationToken(decoded.id);

            if (!user || user.emailVerificationToken !== token) {
                throw appError("Invalid verification token", 401);
            }

            user.isEmailVerified = true;
            user.emailVerificationToken = undefined;
            await user.save();

            return user;
        } catch (error) {
            logger.warn("Email verification failed", {
                error: error.message,
            });
            throw appError("Invalid or expired verification token", 401);
        }
    }
}

const userService = new UserService();
export default userService;
