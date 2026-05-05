// middleware/rateLimiter.js
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // max 150 requests per IP
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        res.status(429).json({
            success: false,
            statusCode: 429,
            message: "Too many requests. Please try again later.",
        });
    },
});

export const chatRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
        `${ipKeyGenerator(req.ip)}:${req.body?.businessId || "unknown-business"}`,

    handler: (req, res) => {
        res.status(429).json({
            success: false,
            statusCode: 429,
            message: "Too many chat requests. Please try again shortly.",
        });
    },
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // only 15 login attempts
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        res.status(429).json({
            success: false,
            statusCode: 429,
            message:
                "Too many login attempts. Please try again after some time.",
        });
    },
});
