import express from "express";
import chatController from "../controllers/chat.controller.js";
import { protectVerifiedCustomer } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { chatRateLimiter } from "../middlewares/rateLimiter.middleware.js";
import { customerTicketValidator } from "../validators/ticket.validator.js";

const router = express.Router();

router.post(
  "/message",
  chatRateLimiter,
  protectVerifiedCustomer,
  validate(customerTicketValidator),
  chatController.createMessage
);

export default router;
