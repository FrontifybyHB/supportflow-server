import nodemailer from "nodemailer";

import config from "../config/config.js";
import logger from "../loggers/winston.logger.js";

const defaultFrom = () => {
    return config.EMAIL_FROM || `"SupportFlow AI" <${config.EMAIL_USER}>`;
};

const isEmailConfigured = () => {
    return Boolean(config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASSWORD);
};

let transporter;

const getTransporter = () => {
    if (!isEmailConfigured()) return null;

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.EMAIL_HOST,
            port: Number(config.EMAIL_PORT || 587),
            secure: Number(config.EMAIL_PORT) === 465,
            auth: {
                user: config.EMAIL_USER,
                pass: config.EMAIL_PASSWORD,
            },
        });
    }

    return transporter;
};

export const verifyEmailService = async () => {
    const transport = getTransporter();
    if (!transport) {
        logger.warn("Email service disabled: SMTP env vars are not configured");
        return false;
    }

    try {
        await transport.verify();
        logger.info("Email service verified");
        return true;
    } catch (error) {
        logger.error("Email service verification failed", { error: error.message });
        return false;
    }
};

export const sendEmail = async ({ to, subject, html, text, from = defaultFrom() }) => {
    if (!to || !subject || !html) {
        throw new Error("sendEmail requires to, subject, and html");
    }

    const transport = getTransporter();
    if (!transport) {
        logger.info("Email skipped because SMTP is not configured", { to, subject });
        return { skipped: true, message: "Email service is not configured" };
    }

    const result = await transport.sendMail({
        from,
        to,
        subject,
        html,
        text,
    });

    logger.info("Email sent", {
        to,
        subject,
        messageId: result.messageId,
    });

    return result;
};

const otpSubject = (purpose) => {
    return purpose === "password_reset"
        ? "Reset your SupportFlow AI password"
        : "Verify your SupportFlow AI account";
};

const otpHtml = ({ otp }) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">SupportFlow AI</h2>
        <p style="font-size: 16px;">Your verification code is:</p>
        <h1 style="font-size: 42px; letter-spacing: 6px; color: #007bff; background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px;">${otp}</h1>
        <p style="font-size: 14px; color: #666;">This code expires in 10 minutes.</p>
        <p style="font-size: 14px; color: #666;">If you did not request this, you can ignore this email.</p>
    </div>
`;

export const sendOtpEmail = async ({ to, otp, purpose }) => {
    const subject = otpSubject(purpose);

    try {
        return await sendEmail({
            to,
            subject,
            html: otpHtml({ otp }),
            text: `Your SupportFlow AI code is ${otp}. It expires in 10 minutes.`,
        });
    } catch (error) {
        logger.info("OTP email failed; OTP logged for development fallback", {
            to,
            purpose,
            otp,
            error: error.message,
        });
        return { success: false, error: error.message };
    }
};
