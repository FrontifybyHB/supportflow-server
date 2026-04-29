import { Server } from "socket.io";
import config from "../config/config.js";

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_room", ({ room }) => {
      if (room) socket.join(room);
    });
  });

  return io;
};
