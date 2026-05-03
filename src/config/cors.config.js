import cors from "cors";
import config from "./config.js";

const splitOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const normalizeOrigin = (origin) => {
  if (!origin || origin === "*") return origin;

  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
};

export const getAllowedOrigins = () =>
  [
    ...splitOrigins(config.CORS_ORIGINS),
    ...splitOrigins(config.CLIENT_URL),
    ...splitOrigins(config.FRONTEND_URL),
  ]
    .map(normalizeOrigin)
    .filter(Boolean)
    .filter((origin, index, origins) => origins.indexOf(origin) === index);

const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true;
  if (allowedOrigins.includes("*")) return true;
  return allowedOrigins.includes(normalizeOrigin(origin));
};

export const buildCorsOptions = () => {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  };
};

export const buildCorsMiddleware = () =>
  cors(buildCorsOptions());
