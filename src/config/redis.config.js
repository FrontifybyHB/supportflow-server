import { Redis } from '@upstash/redis';
import config from './config.js';

const hasRedisCredentials = Boolean(
    config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasRedisCredentials
    ? new Redis({
        url: config.UPSTASH_REDIS_REST_URL,
        token: config.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

export const isRedisConfigured = () => hasRedisCredentials;

export default redis;
