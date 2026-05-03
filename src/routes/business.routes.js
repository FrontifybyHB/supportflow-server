import express from "express";

import agentController from "../controllers/agent.controller.js";
import businessController from "../controllers/business.controller.js";
import {
    protect,
    requireActiveBusiness,
    requireRole,
    requireTenant,
    requireVerified,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
    createBusinessValidator,
    createAgentValidator,
    updateAgentValidator,
    updateBusinessValidator,
} from "../validators/auth.validator.js";

const router = express.Router();

router.get("/public", businessController.listPublicBusinesses);

router.post(
    "/",
    protect,
    requireVerified,
    validate(createBusinessValidator),
    businessController.createBusiness
);

router.get(
    "/me",
    protect,
    requireVerified,
    requireTenant,
    requireActiveBusiness,
    requireRole("admin"),
    businessController.getMyBusiness
);

router.patch(
    "/me",
    protect,
    requireVerified,
    requireTenant,
    requireActiveBusiness,
    requireRole("admin"),
    validate(updateBusinessValidator),
    businessController.updateMyBusiness
);

router.get(
    "/stats",
    protect,
    requireVerified,
    requireTenant,
    requireActiveBusiness,
    requireRole("admin"),
    businessController.getStats
);

router.post(
    "/agents",
    protect,
    requireVerified,
    requireTenant,
    requireActiveBusiness,
    requireRole("admin"),
    validate(createAgentValidator),
    agentController.createAgent
);

router.get(
    "/agents",
    protect,
    requireVerified,
    requireTenant,
    requireActiveBusiness,
    requireRole("admin"),
    agentController.listAgents
);

router.patch(
    "/agents/:id",
    protect,
    requireVerified,
    requireTenant,
    requireActiveBusiness,
    requireRole("admin"),
    validate(updateAgentValidator),
    agentController.updateAgent
);

export default router;
