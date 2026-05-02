import express from "express";

import agentController from "../controllers/agent.controller.js";
import {
    protect,
    requireActiveBusiness,
    requireRole,
    requireTenant,
    requireVerified,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
    createAgentValidator,
    updateAgentValidator,
} from "../validators/auth.validator.js";

const router = express.Router();

router.use(protect, requireVerified, requireTenant, requireActiveBusiness, requireRole("admin"));

router
    .route("/")
    .post(validate(createAgentValidator), agentController.createAgent)
    .get(agentController.listAgents);

router.patch("/:id", validate(updateAgentValidator), agentController.updateAgent);

export default router;
