import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const parseTrustProxy = (value, nodeEnv) => {
    if (value === undefined) {
        return nodeEnv === 'production' ? 1 : false;
    }

    const normalizedValue = String(value).trim();
    const lowerValue = normalizedValue.toLowerCase();

    if (lowerValue === 'true') {
        return true;
    }

    if (lowerValue === 'false') {
        return false;
    }

    if (/^\d+$/.test(normalizedValue)) {
        return Number(normalizedValue);
    }

    return normalizedValue;
};

const _config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    WEB_URL: process.env.WEB_URL || 'https://yourdomain.com',
    CORS_ORIGINS: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN,
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173',
    DB_URL: process.env.DB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase',
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    GMAIL_USER: process.env.GMAIL_USER,
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_MAX_CONNECTIONS: process.env.EMAIL_MAX_CONNECTIONS,
    EMAIL_MAX_MESSAGES: process.env.EMAIL_MAX_MESSAGES,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    REDIS_URL: process.env.REDIS_URL,
    UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
    REDIS_CONNECT_TIMEOUT_MS: process.env.REDIS_CONNECT_TIMEOUT_MS,
    REDIS_COMMAND_TIMEOUT_MS: process.env.REDIS_COMMAND_TIMEOUT_MS,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

_config.TRUST_PROXY = parseTrustProxy(process.env.TRUST_PROXY, _config.NODE_ENV);

_config.JWT_SECRET = _config.JWT_ACCESS_SECRET;

if (!_config.JWT_ACCESS_SECRET) {
    // eslint-disable-next-line no-console
    console.error(
        'JWT_ACCESS_SECRET or JWT_SECRET is required. Set one in your environment before starting the server.'
    );
    process.exit(1);
}

export default _config;
