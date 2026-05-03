import http from "http";
import app from "../app.js";
import logger from "../loggers/winston.logger.js";
import config from "../config/config.js";
import connectedToDatabase from "../config/db.js";
import { startEmailWorker } from "../queues/email.queue.js";
import { warmEmailQueue } from "../utils/bullmq.js";
import { createSocketServer } from "../sockets/socket.config.js";
import { runStartupHealthChecks } from "../utils/healthCheck.js";

class ServerService {
  async start() {
    logger.info(`Booting SupportFlow server (${config.NODE_ENV || "development"})...`);

    try {
      await connectedToDatabase();
    } catch (error) {
      logger.error("MongoDB connection failed; aborting startup", { error: error.message });
      process.exit(1);
    }

    const { hasFailures } = await runStartupHealthChecks();
    if (hasFailures && config.NODE_ENV === "production") {
      logger.error("One or more critical health checks failed; aborting startup");
      process.exit(1);
    }

    warmEmailQueue();
    startEmailWorker().catch((error) => {
      logger.warn("Email worker did not start", { error: error.message });
    });

    const httpServer = http.createServer(app);
    const io = createSocketServer(httpServer);
    app.set("io", io);

    httpServer.listen(config.PORT, () => {
      logger.info(`Server is running on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV || "development"}`);
    });

    this.registerProcessHandlers(httpServer);
  }

  registerProcessHandlers(httpServer) {
    const shutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      httpServer.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled promise rejection", { reason: reason?.message || String(reason) });
    });
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", { error: error.message, stack: error.stack });
    });
  }
}

export default ServerService;
