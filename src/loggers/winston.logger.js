import winston from "winston";
import fs from "fs";

const { createLogger, format, transports } = winston;
const logDir = "logs";

fs.mkdirSync(logDir, { recursive: true });

/*
|--------------------------------------------------------------------------
| Custom log format
|--------------------------------------------------------------------------
*/
const logFormat = format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.colorize(),
    format.errors({ stack: true }),
    format.printf((info) => {
        const { timestamp, level, message, stack, ...metadata } = info;
        const details = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : "";
        const stackTrace = stack ? `\n${stack}` : "";
        return `${timestamp} [${level}]: ${message}${details}${stackTrace}`;
    })
);

/*
|--------------------------------------------------------------------------
| Create logger instance
|--------------------------------------------------------------------------
*/
const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    transports: [
        // 🔴 Error logs
        new transports.File({
            filename: "logs/error.log",
            level: "error",
        }),

        // 🟢 All logs
        new transports.File({
            filename: "logs/combined.log",
        }),
        new transports.Console({
            format: logFormat,
        }),
    ],
});

/*
|--------------------------------------------------------------------------
| 🔥 REQUIRED FOR MORGAN (IMPORTANT)
|--------------------------------------------------------------------------
| Morgan calls: stream.write(message)
*/
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    },
};

export default logger;
