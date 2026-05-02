import {
    getUpstashRestClient,
    isUpstashRestConfigured,
} from '../utils/redis.js';

const redis = getUpstashRestClient();

export const isRedisConfigured = isUpstashRestConfigured;

export default redis;
