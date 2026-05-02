import { body, query } from "express-validator";

export const customerTicketValidator = [
  body("businessId")
    .notEmpty()
    .withMessage("Business ID is required")
    .isMongoId()
    .withMessage("Business ID is invalid"),
  body("message")
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ max: 5000 })
    .withMessage("Message cannot exceed 5000 characters")
    .trim(),
  body("subject")
    .optional()
    .isLength({ max: 150 })
    .withMessage("Subject cannot exceed 150 characters")
    .trim(),
  body("customerName").optional().isLength({ max: 100 }).trim(),
  body("customerEmail")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Customer email is invalid")
    .normalizeEmail(),
  body("priority")
    .optional()
    .isLength({ max: 20 })
    .withMessage("Priority cannot exceed 20 characters")
    .trim(),
];

export const ticketQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),
  query("status")
    .optional()
    .isIn(["open", "pending", "resolved", "closed"])
    .withMessage("Status must be open, pending, resolved, or closed"),
  query("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be low, medium, high, or urgent"),
];

export const statusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["open", "pending", "resolved", "closed"])
    .withMessage("Status must be open, pending, resolved, or closed"),
];

export const assignTicketValidator = [
  body("agentId")
    .notEmpty()
    .withMessage("Agent ID is required")
    .isMongoId()
    .withMessage("Agent ID is invalid"),
];

export const messageValidator = [
  body("content")
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ max: 5000 })
    .withMessage("Message cannot exceed 5000 characters")
    .trim(),
];
