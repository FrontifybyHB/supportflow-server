import crypto from "crypto";

export const generateOtp = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

export const getOtpExpiresAt = () => new Date(Date.now() + 10 * 60 * 1000);
