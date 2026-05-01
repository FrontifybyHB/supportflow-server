import redis, { isRedisConfigured } from '../config/redis.config.js';
import logger from '../loggers/winston.logger.js';

const DEFAULT_TTL_SECONDS = 60 * 5;

export const buildCacheKey = (...parts) => {
    return parts
        .filter((part) => part !== undefined && part !== null && part !== '')
        .map((part) => String(part).trim().toLowerCase().replaceAll(' ', '-'))
        .join(':');
};

const runCacheOperation = async (operation, fallbackValue = null) => {
    if (!isRedisConfigured()) {
        return fallbackValue;
    }

    try {
        return await operation();
    } catch (error) {
        logger.warn('Redis cache operation failed', {
            error: error.message,
        });
        return fallbackValue;
    }
};

export const getCache = async (key) => {
    return runCacheOperation(() => redis.get(key));
};

export const setCache = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
    return runCacheOperation(() => {
        if (ttlSeconds) {
            return redis.set(key, value, { ex: ttlSeconds });
        }

        return redis.set(key, value);
    });
};

export const deleteCache = async (...keys) => {
    const cacheKeys = keys.flat().filter(Boolean);

    if (cacheKeys.length === 0) {
        return 0;
    }

    return runCacheOperation(() => redis.del(...cacheKeys), 0);
};

export const hasCache = async (key) => {
    const exists = await runCacheOperation(() => redis.exists(key), 0);
    return exists === 1;
};

export const rememberCache = async (
    key,
    resolver,
    ttlSeconds = DEFAULT_TTL_SECONDS
) => {
    const cachedValue = await getCache(key);

    if (cachedValue !== null && cachedValue !== undefined) {
        return cachedValue;
    }

    const freshValue = await resolver();
    await setCache(key, freshValue, ttlSeconds);

    return freshValue;
};

export const cacheKeys = {
    userById: (userId) => buildCacheKey('user', userId),
    userByEmail: (email) => buildCacheKey('user', 'email', email),
};
