import { body, param, query } from "express-validator";

export const feedbackTokenParam = [
  param("token")
    .notEmpty()
    .withMessage("Feedback token is required")
    .isHexadecimal()
    .withMessage("Feedback token is invalid")
    .isLength({ min: 64, max: 128 })
    .withMessage("Feedback token is invalid"),
];

export const submitFeedbackValidator = [
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5")
    .toInt(),
  body("resolved")
    .notEmpty()
    .withMessage("Resolved status is required")
    .isBoolean()
    .withMessage("Resolved must be true or false")
    .toBoolean(),
  body("comment")
    .optional({ checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage("Comment cannot exceed 500 characters")
    .trim(),
];

export const generateFeedbackTokenValidator = [
  body("expiresInDays")
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage("expiresInDays must be between 1 and 90")
    .toInt(),
];

export const feedbackAnalyticsQueryValidator = [
  query("businessId")
    .optional()
    .isMongoId()
    .withMessage("Business ID is invalid"),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom must be a valid ISO date"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo must be a valid ISO date"),
  query("feedbackType")
    .optional()
    .isIn(["ai", "agent"])
    .withMessage("feedbackType must be ai or agent"),
  query("category")
    .optional()
    .isIn(["billing", "account", "technical", "general", "refund", "security", "other"])
    .withMessage("Category is invalid"),
];
