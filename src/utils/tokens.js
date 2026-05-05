import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import config from "../config/config.js";
import { REFRESH_TOKEN_COOKIE } from "../constants/constants.js";

const refreshExpiryDays = () => {
    const match = String(config.JWT_REFRESH_EXPIRY || "7d").match(/^(\d+)d$/);
    return match ? Number(match[1]) : 7;
};

export const getRefreshTokenExpiresAt = () => {
    const days = refreshExpiryDays();
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            userId: user._id?.toString?.() || user.userId?.toString?.(),
            role: user.role,
            businessId: user.businessId?.toString?.() || user.businessId || null,
            email: user.email,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
        },
        config.JWT_ACCESS_SECRET,
        { expiresIn: config.JWT_ACCESS_EXPIRY }
    );
};

export const generateRefreshToken = (userId, sessionId = new mongoose.Types.ObjectId().toString()) => {
    const token = jwt.sign(
        {
            userId: userId.toString(),
            sessionId,
        },
        config.JWT_REFRESH_SECRET,
        { expiresIn: config.JWT_REFRESH_EXPIRY }
    );

    return { token, sessionId };
};

export const generateCustomerToken = ({ customerId, businessId, email }) => {
    return jwt.sign(
        {
            customerId: customerId.toString(),
            businessId: businessId.toString(),
            email,
            role: "customer",
        },
        config.JWT_ACCESS_SECRET,
        { expiresIn: "30d" }
    );
};

export const verifyAccessToken = (token) => jwt.verify(token, config.JWT_ACCESS_SECRET);

export const verifyRefreshToken = (token) => jwt.verify(token, config.JWT_REFRESH_SECRET);

export const setRefreshCookie = (res, refreshToken) => {
    const expiresAt = getRefreshTokenExpiresAt();

    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
        expires: expiresAt,
    });
};

export const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
    });
};
