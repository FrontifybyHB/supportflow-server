import { verifyEmailService } from "../src/services/email.service.js";

const ok = await verifyEmailService();

if (ok) {
    console.log("SMTP verified successfully.");
    process.exit(0);
}

console.error("SMTP verification failed. Check EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASSWORD.");
process.exit(1);
