import { body } from "express-validator";

export const selectBusinessAIModelValidator = [
  body("modelId")
    .notEmpty()
    .withMessage("Model ID is required")
    .isMongoId()
    .withMessage("Model ID must be a valid MongoDB ObjectId"),
];
