import { body } from "express-validator";

export const planValidator = [
  body("plan")
    .notEmpty()
    .withMessage("Plan is required")
    .isIn(["free", "pro", "enterprise"])
    .withMessage("Plan must be free, pro, or enterprise"),
];

export const modelValidator = [
  body("name")
    .notEmpty()
    .withMessage("Model name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Model name must be between 2 and 100 characters")
    .trim(),
  body("provider")
    .notEmpty()
    .withMessage("Provider is required")
    .isIn(["openai", "gemini", "custom"])
    .withMessage("Provider must be openai, gemini, or custom"),
  body("apiKey").notEmpty().withMessage("API key is required"),
  body("endpoint").optional().isString().trim(),
  body("isActive").optional().isBoolean().withMessage("isActive must be boolean"),
  body("isDefault").optional().isBoolean().withMessage("isDefault must be boolean"),
  body("config.maxTokens")
    .optional()
    .isInt({ min: 1 })
    .withMessage("maxTokens must be a positive integer"),
  body("config.temperature")
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage("temperature must be between 0 and 2"),
];

export const modelUpdateValidator = [
  body("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Model name must be between 2 and 100 characters")
    .trim(),
  body("provider")
    .optional()
    .isIn(["openai", "gemini", "custom"])
    .withMessage("Provider must be openai, gemini, or custom"),
  body("apiKey").optional().notEmpty().withMessage("API key cannot be empty"),
  body("endpoint").optional().isString().trim(),
  body("isActive").optional().isBoolean().withMessage("isActive must be boolean"),
  body("isDefault").optional().isBoolean().withMessage("isDefault must be boolean"),
  body("config.maxTokens")
    .optional()
    .isInt({ min: 1 })
    .withMessage("maxTokens must be a positive integer"),
  body("config.temperature")
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage("temperature must be between 0 and 2"),
];
