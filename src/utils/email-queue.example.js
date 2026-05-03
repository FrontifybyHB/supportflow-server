import { queueEmail, startEmailWorker } from "./bullmq.js";

export const startWorkers = async () => {
    await startEmailWorker();
};

export const queueWelcomeEmail = async (user) => {
    return queueEmail({
        to: user.email,
        subject: "Welcome to SupportFlow AI",
        html: `<p>Hello ${user.name}, welcome to SupportFlow AI.</p>`,
        text: `Hello ${user.name}, welcome to SupportFlow AI.`,
        metadata: {
            userId: user._id?.toString?.(),
            type: "welcome",
        },
    });
};
