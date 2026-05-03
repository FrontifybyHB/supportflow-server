import logger from "../loggers/winston.logger.js";
import { queueEmail, startEmailWorker as startBullEmailWorker } from "../utils/bullmq.js";

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

export const enqueueOtpEmail = async ({ to, otp, purpose }) => {
    try {
        return await queueEmail({
            to,
            subject: otpSubject(purpose),
            html: otpHtml({ otp }),
            text: `Your SupportFlow AI code is ${otp}. It expires in 10 minutes.`,
            metadata: { purpose },
        });
    } catch (error) {
        logger.error("OTP email enqueue failed", {
            to,
            purpose,
            error: error.message,
        });
        return {
            queued: false,
            delivered: false,
            error: error.message,
        };
    }
};

export const startEmailWorker = startBullEmailWorker;
export { EMAIL_QUEUE_NAME, getEmailQueue } from "../utils/bullmq.js";
export {
    getCurrentQueueRedisConnection as getQueueConnection,
    isQueueRedisConfigured as isQueueConfigured,
} from "../utils/redis.js";
