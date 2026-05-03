import express from "express";
import feedbackController from "../controllers/feedback.controller.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";
import tenantMiddleware from "../middlewares/tenant.middleware.js";
import { objectIdParam, validate } from "../middlewares/validator.middleware.js";
import {
  feedbackAnalyticsQueryValidator,
  feedbackTokenParam,
  generateFeedbackTokenValidator,
  submitFeedbackValidator,
} from "../validators/feedback.validator.js";

const router = express.Router();

router.post(
  "/:token",
  validate(feedbackTokenParam),
  validate(submitFeedbackValidator),
  feedbackController.submitFeedback
);

router.use(protect);
router.use(tenantMiddleware);

router.post(
  "/tickets/:id/token",
  restrictTo("agent", "admin", "superadmin"),
  validate(objectIdParam()),
  validate(generateFeedbackTokenValidator),
  feedbackController.generateToken
);

router.get(
  "/analytics",
  restrictTo("admin", "superadmin"),
  validate(feedbackAnalyticsQueryValidator),
  feedbackController.getAnalytics
);

export default router;
