import logger from "../loggers/winston.logger.js";
import config from "../config/config.js";
import ApiResponse from "../utils/apiResponse.js";

const errorHandler = (err, req, res, next) => {
    void next;

    const statusCode = err.statusCode || 500;

    const nodeEnv = config.NODE_ENV;

    // Backend logging (FULL DETAILS)
    logger.error(err.message, {
        statusCode,
        method: req.method,
        path: req.originalUrl,
        stack: nodeEnv === "development" ? err.stack : undefined,
    });

    const message =
        nodeEnv === "production" && statusCode >= 500
            ? "Internal Server Error"
            : err.message;

    res.status(statusCode).json(ApiResponse.error(message, statusCode));
};

export default errorHandler;
