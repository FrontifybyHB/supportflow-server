import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import config from "../config/config.js";
import User from "../models/user.model.js";
import Ticket from "../models/ticket.model.js";

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const headerToken = socket.handshake.headers.authorization;
      const token = authToken || headerToken?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Socket authentication token is required"));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded.type && decoded.type !== "access") {
        return next(new Error("Invalid socket access token"));
      }

      const user = await User.findById(decoded.id)
        .select("+role businessId isActive")
        .lean();

      if (!user || user.isActive === false) {
        return next(new Error("Socket user is not active"));
      }

      socket.user = user;
      return next();
    } catch {
      return next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_business", ({ businessId }, callback) => {
      const result = joinBusinessRoom(socket, businessId);
      if (callback) callback(result);
    });

    socket.on("join_room", async ({ room }, callback) => {
      const result = await joinAuthorizedRoom(socket, room).catch(() => ({
        success: false,
        message: "Could not join room",
      }));
      if (callback) callback(result);
    });
  });

  return io;
};

const joinBusinessRoom = (socket, businessId) => {
  const user = socket.user;

  if (!["admin", "agent"].includes(user.role)) {
    return { success: false, message: "Only admins and agents can join business rooms" };
  }

  if (!user.businessId || String(user.businessId) !== String(businessId)) {
    return { success: false, message: "Cannot join another business room" };
  }

  socket.join(String(businessId));
  return { success: true, room: String(businessId) };
};

const joinAuthorizedRoom = async (socket, room) => {
  if (!room) return { success: false, message: "Room is required" };

  const user = socket.user;

  if (user.businessId && String(room) === String(user.businessId)) {
    return joinBusinessRoom(socket, room);
  }

  if (!mongoose.Types.ObjectId.isValid(room)) {
    return { success: false, message: "Room is not authorized" };
  }

  const ticket = await Ticket.findById(room)
    .select("businessId assignedAgent")
    .lean();

  if (!ticket) return { success: false, message: "Room not found" };

  if (user.role === "superadmin") {
    socket.join(String(room));
    return { success: true, room: String(room) };
  }

  if (!user.businessId || String(ticket.businessId) !== String(user.businessId)) {
    return { success: false, message: "Cannot join another business ticket room" };
  }

  if (
    user.role === "agent" &&
    ticket.assignedAgent &&
    String(ticket.assignedAgent) !== String(user._id)
  ) {
    return { success: false, message: "Cannot join ticket assigned to another agent" };
  }

  socket.join(String(room));
  return { success: true, room: String(room) };
};
