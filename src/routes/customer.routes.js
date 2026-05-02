import express from "express";

import customerController from "../controllers/customer.controller.js";
import { validate } from "../middlewares/validator.middleware.js";
import { identifyCustomerValidator } from "../validators/auth.validator.js";

const router = express.Router();

router.post("/identify", validate(identifyCustomerValidator), customerController.identify);

export default router;
