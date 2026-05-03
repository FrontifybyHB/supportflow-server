import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import config from "../config/config.js";
import { buildCorsOptions } from "../config/cors.config.js";
import User from "../models/user.model.js";
import Ticket from "../models/ticket.model.js";

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: buildCorsOptions(),
  });

  io.use(async (socket, next) => {
    try {
      const token = getSocketToken(socket);

      if (!token) {
        return next(new Error("Socket authentication token is required"));
      }

      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
      if (decoded.type && decoded.type !== "access") {
        return next(new Error("Invalid socket access token"));
      }
      const userId = decoded.userId || decoded.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return next(new Error("Invalid socket access token"));
      }

      const user = await User.findById(userId)
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

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const headerToken = socket.handshake.headers.authorization;
  if (typeof headerToken !== "string") return "";

  const match = headerToken.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
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

  const ticketFilter =
    user.role === "superadmin"
      ? { _id: room }
      : { _id: room, businessId: user.businessId };

  const ticket = await Ticket.findOne(ticketFilter)
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
