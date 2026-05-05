import mongoose from "mongoose";

import config from "../config/config.js";
import logger from "../loggers/winston.logger.js";
import cacheService from "../services/cache.service.js";
import { createEmailTransporter, getEmailProviderStatus } from "../services/email.service.js";
import { getEmailQueue, getQueueConnection, isQueueConfigured } from "../queues/email.queue.js";

const STATUS = Object.freeze({ OK: "OK", WARN: "WARN", FAIL: "FAIL", SKIP: "SKIP" });
const CRITICAL_CHECKS = new Set(["Env vars", "MongoDB"]);
const PING_TIMEOUT_MS = 3000;

const withTimeout = (promise, ms, label) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms).unref()
        ),
    ]);
};

const MONGOOSE_STATES = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
};

const required = (value) => Boolean(value && String(value).trim().length > 0);

const checkRequiredEnv = () => {
    const missing = [];
    if (!required(config.DB_URL)) missing.push("DB_URL");
    if (!required(config.JWT_SECRET) && !required(config.JWT_ACCESS_SECRET)) {
        missing.push("JWT_ACCESS_SECRET (or JWT_SECRET)");
    }
    if (!required(config.JWT_SECRET) && !required(config.JWT_REFRESH_SECRET)) {
        missing.push("JWT_REFRESH_SECRET (or JWT_SECRET)");
    }

    if (missing.length === 0) {
        return { name: "Env vars", status: STATUS.OK, detail: "required vars present" };
    }
    return { name: "Env vars", status: STATUS.FAIL, detail: `missing: ${missing.join(", ")}` };
};

const checkMongo = async () => {
    const state = mongoose.connection?.readyState;
    if (state === 1) {
        try {
            await mongoose.connection.db.admin().ping();
            const dbName = mongoose.connection.name || "unknown";
            return { name: "MongoDB", status: STATUS.OK, detail: `connected (${dbName})` };
        } catch (error) {
            return { name: "MongoDB", status: STATUS.FAIL, detail: `ping failed: ${error.message}` };
        }
    }
    return {
        name: "MongoDB",
        status: STATUS.FAIL,
        detail: `not connected (state=${MONGOOSE_STATES[state] ?? state})`,
    };
};

const checkUpstashCache = async () => {
    if (!cacheService.isAvailable()) {
        return {
            name: "Upstash Redis (cache)",
            status: STATUS.WARN,
            detail: "not configured (set UPSTASH_REDIS_REST_URL + _TOKEN to enable caching)",
        };
    }
    try {
        const ok = await withTimeout(cacheService.ping(), PING_TIMEOUT_MS, "cache ping");
        return ok
            ? { name: "Upstash Redis (cache)", status: STATUS.OK, detail: "reachable" }
            : { name: "Upstash Redis (cache)", status: STATUS.FAIL, detail: "ping returned non-PONG" };
    } catch (error) {
        return { name: "Upstash Redis (cache)", status: STATUS.FAIL, detail: `ping error: ${error.message}` };
    }
};

const checkBullMqRedis = async () => {
    if (!isQueueConfigured()) {
        return {
            name: "BullMQ Redis (queues)",
            status: STATUS.WARN,
            detail: "not configured (set UPSTASH_REDIS_URL or REDIS_URL to enable async email queue)",
        };
    }
    try {
        await withTimeout(getEmailQueue(), PING_TIMEOUT_MS * 2, "BullMQ queue init");
        const conn = getQueueConnection();
        if (!conn) {
            return {
                name: "BullMQ Redis (queues)",
                status: STATUS.WARN,
                detail: "configured but not connected yet",
            };
        }

        const reply = await withTimeout(conn.ping(), PING_TIMEOUT_MS, "BullMQ Redis ping");
        return reply === "PONG"
            ? { name: "BullMQ Redis (queues)", status: STATUS.OK, detail: "reachable" }
            : { name: "BullMQ Redis (queues)", status: STATUS.FAIL, detail: `unexpected reply: ${reply}` };
    } catch (error) {
        return { name: "BullMQ Redis (queues)", status: STATUS.FAIL, detail: `ping error: ${error.message}` };
    }
};

const checkSmtp = async () => {
    const emailStatus = getEmailProviderStatus();

    if (emailStatus.provider === "resend") {
        return {
            name: "Email delivery",
            status: STATUS.OK,
            detail: "Resend API configured",
        };
    }

    if (emailStatus.provider !== "smtp") {
        return {
            name: "Email delivery",
            status: STATUS.WARN,
            detail: "not configured (set RESEND_API_KEY or SMTP env vars)",
        };
    }

    const transporter = createEmailTransporter();

    try {
        await withTimeout(transporter.verify(), PING_TIMEOUT_MS * 2, "SMTP verify");
        return { name: "Email delivery", status: STATUS.OK, detail: `SMTP verified (${config.EMAIL_HOST})` };
    } catch (error) {
        return { name: "Email delivery", status: STATUS.FAIL, detail: `SMTP verify failed: ${error.message}` };
    }
};

const checkGoogleOAuth = () => {
    if (!required(config.GOOGLE_CLIENT_ID)) {
        return { name: "Google OAuth", status: STATUS.SKIP, detail: "not configured (optional)" };
    }
    return { name: "Google OAuth", status: STATUS.OK, detail: "client id loaded" };
};

const formatLine = (result) => {
    const tag = `[ ${result.status.padEnd(4)} ]`;
    const name = result.name.padEnd(24);
    return `${tag} ${name} ${result.detail}`;
};

export const runStartupHealthChecks = async () => {
    const results = await Promise.all([
        Promise.resolve(checkRequiredEnv()),
        checkMongo(),
        checkUpstashCache(),
        checkBullMqRedis(),
        checkSmtp(),
        Promise.resolve(checkGoogleOAuth()),
    ]);

    logger.info("==================== Startup Health Checks ====================");
    for (const r of results) {
        const line = formatLine(r);
        if (r.status === STATUS.FAIL) logger.error(line);
        else if (r.status === STATUS.WARN) logger.warn(line);
        else logger.info(line);
    }
    logger.info("===============================================================");

    const failed = results.filter((r) => r.status === STATUS.FAIL);
    const criticalFailures = failed.filter((r) => CRITICAL_CHECKS.has(r.name));
    return {
        results,
        failed,
        criticalFailures,
        hasFailures: failed.length > 0,
        hasCriticalFailures: criticalFailures.length > 0,
    };
};

export { STATUS };
