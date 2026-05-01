import dotenv from 'dotenv';

dotenv.config();

const _config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    WEB_URL: process.env.WEB_URL || 'https://yourdomain.com',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    DB_URL: process.env.DB_URL || 'mongodb://localhost:27017/mydatabase',
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    GMAIL_USER: process.env.GMAIL_USER,
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};


export default _config;
