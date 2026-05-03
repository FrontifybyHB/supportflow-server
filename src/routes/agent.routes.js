import express from "express";
import agentController from "../controllers/agent.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import tenantMiddleware from "../middlewares/tenant.middleware.js";
import { objectIdParam, validate } from "../middlewares/validator.middleware.js";
import {
  assignTicketValidator,
  messageValidator,
  statusValidator,
  ticketQueryValidator,
} from "../validators/ticket.validator.js";

const router = express.Router();

router.use(protect);
router.use(tenantMiddleware);
router.use(restrictTo("agent", "admin", "superadmin"));

router.get("/me", agentController.getMe);
router.get("/tickets", validate(ticketQueryValidator), agentController.listTickets);
router.get("/tickets/:id", validate(objectIdParam()), agentController.getTicket);
router.patch(
  "/tickets/:id/status",
  validate(objectIdParam()),
  validate(statusValidator),
  agentController.updateStatus
);
router.patch(
  "/tickets/:id/assign",
  restrictTo("admin", "superadmin"),
  validate(objectIdParam()),
  validate(assignTicketValidator),
  agentController.assignTicket
);
router.post(
  "/tickets/:id/messages",
  validate(objectIdParam()),
  validate(messageValidator),
  agentController.addMessage
);

export default router;
