import { Redis } from "@upstash/redis";
import IORedis from "ioredis";

import config from "../config/config.js";
import logger from "../loggers/winston.logger.js";

const getQueueRedisUrl = () => config.UPSTASH_REDIS_URL || config.REDIS_URL;

export const isUpstashRestConfigured = () => {
    return Boolean(config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN);
};

export const isQueueRedisConfigured = () => Boolean(getQueueRedisUrl());

export const createUpstashRestClient = () => {
    if (!isUpstashRestConfigured()) {
        logger.warn("Upstash REST Redis disabled: REST URL/token not configured");
        return null;
    }

    return new Redis({
        url: config.UPSTASH_REDIS_REST_URL,
        token: config.UPSTASH_REDIS_REST_TOKEN,
    });
};

let upstashRestClient;

export const getUpstashRestClient = () => {
    if (!upstashRestClient) {
        upstashRestClient = createUpstashRestClient();
    }
    return upstashRestClient;
};

export const verifyUpstashRestConnection = async () => {
    const client = getUpstashRestClient();
    if (!client) return false;

    try {
        const reply = await client.ping();
        const ok = reply === "PONG" || reply === "pong";
        logger.info("Upstash REST Redis ping complete", { ok });
        return ok;
    } catch (error) {
        logger.error("Upstash REST Redis ping failed", { error: error.message });
        return false;
    }
};

export const createQueueRedisConnection = () => {
    const redisUrl = getQueueRedisUrl();
    if (!redisUrl) {
        logger.warn("BullMQ Redis disabled: UPSTASH_REDIS_URL / REDIS_URL not configured");
        return null;
    }

    const connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        connectTimeout: Number(config.REDIS_CONNECT_TIMEOUT_MS || 5000),
        commandTimeout: Number(config.REDIS_COMMAND_TIMEOUT_MS || 3000),
        lazyConnect: true,
    });

    let loggedError = false;
    connection.on("error", (error) => {
        if (loggedError) return;
        loggedError = true;
        logger.warn("BullMQ Redis connection error", { error: error.message });
    });
    connection.on("ready", () => {
        loggedError = false;
        logger.info("BullMQ Redis connection ready");
    });
    connection.on("close", () => {
        logger.info("BullMQ Redis connection closed");
    });

    return connection;
};

let queueConnection;
let queueConnectionPromise;

export const getCurrentQueueRedisConnection = () => {
    return queueConnection;
};

export const getQueueRedisConnection = async () => {
    if (queueConnection?.status === "ready") return queueConnection;
    if (queueConnectionPromise) return queueConnectionPromise;

    queueConnectionPromise = (async () => {
        const connection = createQueueRedisConnection();
        if (!connection) return null;

        try {
            await Promise.race([
                connection.connect(),
                new Promise((_, reject) => {
                    setTimeout(
                        () => reject(new Error("Redis connection timeout")),
                        Number(config.REDIS_CONNECT_TIMEOUT_MS || 5000)
                    );
                }),
            ]);

            queueConnection = connection;
            return queueConnection;
        } catch (error) {
            logger.warn("BullMQ Redis unavailable; queue will use fallback behavior", {
                error: error.message,
            });
            connection.disconnect();
            queueConnectionPromise = null;
            return null;
        }
    })();

    return queueConnectionPromise;
};
