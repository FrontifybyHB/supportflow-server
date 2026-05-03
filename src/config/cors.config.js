import cors from "cors";
import config from "./config.js";

export const buildCorsMiddleware = () =>
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  });
