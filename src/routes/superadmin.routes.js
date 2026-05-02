import express from "express";
import superAdminController from "../controllers/superadmin.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import { objectIdParam, validate } from "../middlewares/validator.middleware.js";
import {
  modelValidator,
  modelUpdateValidator,
  planValidator,
} from "../validators/superadmin.validator.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("superadmin"));

router.get("/stats", superAdminController.getStats);
router.get("/usage", superAdminController.getUsage);

router.get("/businesses", superAdminController.listBusinesses);
router.get("/businesses/:id", validate(objectIdParam()), superAdminController.getBusiness);
router.patch("/businesses/:id/suspend", validate(objectIdParam()), superAdminController.suspendBusiness);
router.patch("/businesses/:id/activate", validate(objectIdParam()), superAdminController.activateBusiness);
router.patch(
  "/businesses/:id/plan",
  validate(objectIdParam()),
  validate(planValidator),
  superAdminController.changeBusinessPlan
);

router.get("/users", superAdminController.listUsers);
router.get("/users/:id", validate(objectIdParam()), superAdminController.getUser);
router.patch("/users/:id/deactivate", validate(objectIdParam()), superAdminController.deactivateUser);
router.patch("/users/:id/reactivate", validate(objectIdParam()), superAdminController.reactivateUser);

router.get("/models", superAdminController.listModels);
router.get("/models/:id", validate(objectIdParam()), superAdminController.getModel);
router.post(
  "/models",
  validate(modelValidator),
  superAdminController.createModel
);
router.patch(
  "/models/:id",
  validate(objectIdParam()),
  validate(modelUpdateValidator),
  superAdminController.updateModel
);
router.patch("/models/:id/default", validate(objectIdParam()), superAdminController.setDefaultModel);
router.delete("/models/:id", validate(objectIdParam()), superAdminController.deleteModel);

export default router;
