import express from "express";

import superAdminController from "../controllers/superadmin.controller.js";
import { protect, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import {
    bootstrapSuperAdminValidator,
    businessPlanValidator,
    businessStatusValidator,
    mongoIdParamValidator,
    updateUserRoleValidator,
} from "../validators/auth.validator.js";

const router = express.Router();

// Bootstrap route - no auth required for initial setup
router.post(
    "/bootstrap",
    validate(bootstrapSuperAdminValidator),
    superAdminController.bootstrapSuperAdmin
);

// All other routes require super admin auth
router.use(protect, requireRole("superadmin"));

router.get("/businesses", superAdminController.listBusinesses);
router.get(
    "/businesses/:id",
    validate(mongoIdParamValidator),
    superAdminController.getBusiness
);
router.patch(
    "/businesses/:id/toggle",
    validate(mongoIdParamValidator),
    superAdminController.toggleBusiness
);
router.patch(
    "/businesses/:id/status",
    validate(businessStatusValidator),
    superAdminController.updateBusinessStatus
);
router.patch(
    "/businesses/:id/plan",
    validate(businessPlanValidator),
    superAdminController.updateBusinessPlan
);
router.get("/users", superAdminController.listUsers);
router.patch(
    "/users/:id/role",
    validate(updateUserRoleValidator),
    superAdminController.updateUserRole
);
router.get("/stats", superAdminController.stats);

export default router;
