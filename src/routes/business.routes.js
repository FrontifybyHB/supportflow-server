import express from "express";

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
    updateBusinessValidator,
} from "../validators/auth.validator.js";

const router = express.Router();

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

export default router;
