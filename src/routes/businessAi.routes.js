import express from "express";
import businessAIController from "../controllers/businessAi.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import tenantMiddleware from "../middlewares/tenant.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { selectBusinessAIModelValidator } from "../validators/businessAi.validator.js";

const router = express.Router();

router.use(protect);
router.use(tenantMiddleware);
router.use(restrictTo("admin", "superadmin"));

router.get("/models", businessAIController.listModels);
router.get("/selection", businessAIController.getSelection);
router.patch(
  "/selection",
  validate(selectBusinessAIModelValidator),
  businessAIController.selectModel
);

export default router;
