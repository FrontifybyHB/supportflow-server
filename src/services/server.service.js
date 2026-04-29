import http from "http";
import app from "../app.js";
import logger from "../loggers/winston.logger.js";
import config from "../config/config.js";
import connectedToDatabase from "../config/db.js";
import { createSocketServer } from "../sockets/socket.config.js";

class ServerService {
  async start() {
    await connectedToDatabase();

    const httpServer = http.createServer(app);
    const io = createSocketServer(httpServer);
    app.set("io", io);

    httpServer.listen(config.PORT, () => {
      logger.info(`Server is running on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV || "development"}`);
    });
  }
}

export default ServerService;
