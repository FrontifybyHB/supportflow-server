import express from "express";
import chatController from "../controllers/chat.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { customerTicketValidator } from "../validators/ticket.validator.js";

const router = express.Router();

router.post("/message", validate(customerTicketValidator), chatController.createMessage);

export default router;
