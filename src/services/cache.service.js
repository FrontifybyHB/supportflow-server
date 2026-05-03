import redis, { isRedisConfigured } from "../config/redis.config.js";
import logger from "../loggers/winston.logger.js";

const DEFAULT_TTL_SECONDS = 60;
let warnedUnavailable = false;

const warnOnce = () => {
    if (warnedUnavailable) return;
    warnedUnavailable = true;
    logger.warn(
        "Cache disabled: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set. " +
        "Repository reads will hit MongoDB on every request."
    );
};

class CacheService {
    constructor(client = redis) {
        this.client = client;
        this.memory = new Map();
    }

    isAvailable() {
        return isRedisConfigured() && Boolean(this.client);
    }

    async ping() {
        if (!this.isAvailable()) return false;
        const reply = await this.client.ping();
        return reply === "PONG" || reply === "pong";
    }

    async get(key) {
        const memoryValue = this.getMemory(key);
        if (memoryValue !== null) return memoryValue;

        if (!this.isAvailable()) return null;

        try {
            const value = await this.client.get(key);
            return value ?? null;
        } catch (error) {
            logger.warn("Cache get failed", { key, error: error.message });
            return null;
        }
    }

    async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
        if (!this.isAvailable()) {
            warnOnce();
            this.setMemory(key, value, ttlSeconds);
            return false;
        }

        try {
            await this.client.set(key, value, { ex: ttlSeconds });
            return true;
        } catch (error) {
            logger.warn("Cache set failed", { key, error: error.message });
            this.setMemory(key, value, ttlSeconds);
            return false;
        }
    }

    async del(key) {
        this.memory.delete(key);
        if (!this.isAvailable()) return false;

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.warn("Cache del failed", { key, error: error.message });
            return false;
        }
    }

    async delMany(keys = []) {
        for (const key of keys) {
            this.memory.delete(key);
        }

        if (!this.isAvailable() || keys.length === 0) return false;

        try {
            await this.client.del(...keys);
            return true;
        } catch (error) {
            logger.warn("Cache delMany failed", { count: keys.length, error: error.message });
            return false;
        }
    }

    async delByPrefix(prefix) {
        if (!prefix) return false;

        for (const key of this.memory.keys()) {
            if (key.startsWith(prefix)) {
                this.memory.delete(key);
            }
        }

        if (!this.isAvailable()) return false;

        try {
            const keys = await this.client.keys(`${prefix}*`);
            if (!keys || keys.length === 0) return true;

            await this.client.del(...keys);
            return true;
        } catch (error) {
            logger.warn("Cache delByPrefix failed", { prefix, error: error.message });
            return false;
        }
    }

    getMemory(key) {
        const cached = this.memory.get(key);
        if (!cached) return null;

        if (cached.expiresAt <= Date.now()) {
            this.memory.delete(key);
            return null;
        }

        return cached.value;
    }

    setMemory(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
        this.memory.set(key, {
            value,
            expiresAt: Date.now() + (Math.max(Number(ttlSeconds) || DEFAULT_TTL_SECONDS, 1) * 1000),
        });
    }

    /**
     * Read-through helper: returns cached value if present, otherwise runs `loader`,
     * stores its result, and returns it. Falsy/null loader results are NOT cached
     * (so 404-style misses don't get pinned).
     */
    async wrap(key, ttlSeconds, loader) {
        const cached = await this.get(key);
        if (cached !== null && cached !== undefined) return cached;

        const fresh = await loader();
        if (fresh !== null && fresh !== undefined) {
            await this.set(key, fresh, ttlSeconds);
        }
        return fresh;
    }
}

const cacheService = new CacheService();
export default cacheService;
export { CacheService, DEFAULT_TTL_SECONDS };
