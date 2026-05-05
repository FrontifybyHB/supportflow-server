import { createEmailTransporter } from "../services/email.service.js";

/**
 * Create Nodemailer transporter
 * -----------------------------
 * Uses simple SMTP (no Google OAuth)
 */
export const createTransporter = () => {
    return createEmailTransporter();
};
