export const ACCESS_TOKEN_EXPIRATION = '15m';
export const REFRESH_TOKEN_EXPIRATION = '7d';
export const FORGOT_PASSWORD_TOKEN_EXPIRATION = '15m';
export const VERIFICATION_TOKEN_EXPIRATION = '10m';
export const ISSUER = "Backend Starter";

export const ROLES = {
    CUSTOMER: 'customer',
    AGENT: 'agent',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin',
};

export const AUTH_PROVIDERS = {
    PASSWORD: 'password',
    GOOGLE: 'google',
};

export const OTP_PURPOSES = {
    EMAIL_VERIFICATION: 'email_verification',
    CUSTOMER_EMAIL_VERIFICATION: 'customer_email_verification',
    PASSWORD_RESET: 'password_reset',
};

export const REFRESH_TOKEN_COOKIE = 'refreshToken';
