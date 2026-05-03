import { Queue, Worker } from "bullmq";

import logger from "../loggers/winston.logger.js";
import { sendEmail } from "../services/email.service.js";
import { getQueueRedisConnection } from "./redis.js";

export const EMAIL_QUEUE_NAME = "supportflow-email";

const defaultJobOptions = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
};

let emailQueue;
let emailWorker;
let queueInitStarted = false;

const sendEmailInBackground = ({ to, subject, html, text }) => {
    setImmediate(() => {
        sendEmail({ to, subject, html, text }).catch((error) => {
            logger.error("Inline background email fallback failed", {
                to,
                subject,
                error: error.message,
            });
        });
    });
};

export const warmEmailQueue = () => {
    if (queueInitStarted || emailQueue) return;
    queueInitStarted = true;
    getEmailQueue().catch((error) => {
        logger.warn("Email queue warmup failed", { error: error.message });
    });
};

export const getEmailQueue = async () => {
    if (emailQueue) return emailQueue;

    const connection = await getQueueRedisConnection();
    if (!connection) return null;

    emailQueue = new Queue(EMAIL_QUEUE_NAME, {
        connection,
        defaultJobOptions,
    });

    logger.info("Email queue initialized", { queue: EMAIL_QUEUE_NAME });
    return emailQueue;
};

export const queueEmail = async ({ to, subject, html, text, metadata = {} }) => {
    let queue = emailQueue;

    if (!queue && !queueInitStarted) {
        warmEmailQueue();
    }

    if (!queue) {
        logger.warn("Email queue unavailable; sending email in background fallback", {
            to,
            subject,
        });
        sendEmailInBackground({ to, subject, html, text });
        return {
            queued: false,
            fallback: "background-email",
        };
    }

    try {
        return await queue.add(
            "send-email",
            { to, subject, html, text, metadata },
            defaultJobOptions
        );
    } catch (error) {
        logger.error("Email queue add failed; using background fallback", {
            to,
            subject,
            error: error.message,
        });
        sendEmailInBackground({ to, subject, html, text });
        return {
            queued: false,
            fallback: "background-email",
        };
    }
};

export const startEmailWorker = async () => {
    if (emailWorker) return emailWorker;

    const connection = await getQueueRedisConnection();
    if (!connection) {
        logger.warn("Email worker not started because Redis queue connection is unavailable");
        return null;
    }

    emailWorker = new Worker(
        EMAIL_QUEUE_NAME,
        async (job) => {
            const { to, subject, html, text } = job.data;
            const result = await sendEmail({ to, subject, html, text });
            logger.info("Email job completed", {
                jobId: job.id,
                to,
                subject,
            });
            return result;
        },
        {
            connection,
            concurrency: 5,
        }
    );

    emailWorker.on("completed", (job) => {
        logger.info("Email worker completed job", { jobId: job.id });
    });

    emailWorker.on("failed", (job, error) => {
        logger.error("Email worker failed job", {
            jobId: job?.id,
            attemptsMade: job?.attemptsMade,
            error: error.message,
        });
    });

    emailWorker.on("error", (error) => {
        logger.error("Email worker error", { error: error.message });
    });

    logger.info("Email worker started", { queue: EMAIL_QUEUE_NAME });
    return emailWorker;
};
