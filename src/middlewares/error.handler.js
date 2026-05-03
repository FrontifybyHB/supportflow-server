import logger from "../loggers/winston.logger.js";
import config from "../config/config.js";

const errorHandler = (err, req, res, _next) => {
    void _next;

    const statusCode = err.statusCode || 500;

    const nodeEnv = config.NODE_ENV;

    // Backend logging (FULL DETAILS)
    logger.error(err.message, {
        statusCode,
        method: req.method,
        path: req.originalUrl,
        stack: nodeEnv === "development" ? err.stack : undefined,
    });

    // Frontend-safe response
    const isServerError = statusCode >= 500;

    res.status(statusCode).json({
        success: false,
        message:
            nodeEnv === "production" && isServerError
                ? "Internal Server Error"
                : err.message,
        code: err.code,
        stack: nodeEnv === "development" ? err.stack : undefined,
    });
};

export default errorHandler;
