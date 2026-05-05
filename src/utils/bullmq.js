import { Queue, Worker } from "bullmq";

import config from "../config/config.js";
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

const summarizeEmailResult = (result = {}) => ({
    skipped: Boolean(result.skipped),
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
});

const withTimeout = (promise, ms, label) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms).unref()
        ),
    ]);
};

const sendEmailDirectFallback = async ({ to, subject, html, text }) => {
    const result = await sendEmail({ to, subject, html, text });
    const email = summarizeEmailResult(result);

    logger.info("Email sent with direct fallback", {
        to,
        subject,
        skipped: email.skipped,
        messageId: email.messageId,
    });

    return {
        queued: false,
        fallback: "direct-email",
        email,
    };
};

const sendEmailDirectFallbackInBackground = ({ to, subject, html, text, reason }) => {
    sendEmailDirectFallback({ to, subject, html, text }).catch((error) => {
        logger.error("Background direct email fallback failed", {
            to,
            subject,
            reason,
            error: error.message,
        });
    });

    return {
        queued: false,
        fallback: "background-direct-email",
        pending: true,
        reason,
    };
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

    if (!queue) {
        try {
            queue = await withTimeout(
                getEmailQueue(),
                Number(config.EMAIL_QUEUE_INIT_TIMEOUT_MS || 1500),
                "Email queue init"
            );
        } catch (error) {
            logger.warn("Email queue init timed out; using background direct fallback", {
                to,
                subject,
                error: error.message,
            });
            queue = null;
        }
    }

    if (!queue) {
        logger.warn("Email queue unavailable; sending email with background direct fallback", {
            to,
            subject,
        });
        return sendEmailDirectFallbackInBackground({
            to,
            subject,
            html,
            text,
            reason: "queue_unavailable",
        });
    }

    try {
        const job = await withTimeout(
            queue.add(
                "send-email",
                { to, subject, html, text, metadata },
                defaultJobOptions
            ),
            Number(config.EMAIL_QUEUE_ADD_TIMEOUT_MS || 3000),
            "Email queue add"
        );
        return {
            queued: true,
            jobId: job.id,
        };
    } catch (error) {
        logger.error("Email queue add failed; using background direct fallback", {
            to,
            subject,
            error: error.message,
        });
        return sendEmailDirectFallbackInBackground({
            to,
            subject,
            html,
            text,
            reason: "queue_add_failed",
        });
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
