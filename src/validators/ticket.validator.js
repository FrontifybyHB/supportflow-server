import { body, query } from "express-validator";

export const customerTicketValidator = [
  body("businessId")
    .notEmpty()
    .withMessage("Business ID is required")
    .isMongoId()
    .withMessage("Business ID is invalid"),
  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 1, max: 3000 })
    .withMessage("Message must be between 1 and 3000 characters"),
  body("subject")
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Subject cannot exceed 150 characters"),
  body("conversationId")
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage("Conversation ID is invalid"),
  body("customerName").optional().trim().isLength({ max: 100 }),
  body("customerEmail")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Customer email is invalid")
    .normalizeEmail(),
  body("priority")
    .optional()
    .trim()
    .isIn(["Low", "Medium", "High", "Critical", "low", "medium", "high", "urgent"])
    .withMessage("Priority must be Low, Medium, High, or Critical"),
  body("category")
    .optional()
    .isIn(["billing", "account", "technical", "general", "refund", "security", "other"])
    .withMessage("Category is invalid"),
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
    .isIn(["Low", "Medium", "High", "Critical", "low", "medium", "high", "urgent"])
    .withMessage("Priority must be Low, Medium, High, or Critical"),
  query("category")
    .optional()
    .isIn(["billing", "account", "technical", "general", "refund", "security", "other"])
    .withMessage("Category is invalid"),
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
    .trim()
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ min: 1, max: 3000 })
    .withMessage("Message must be between 1 and 3000 characters"),
];
