import express from "express";

import authController from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from "../middlewares/validator.middleware.js";
import {
    forgotPasswordValidator,
    googleLoginValidator,
    loginValidator,
    registerValidator,
    resendOtpValidator,
    resetPasswordValidator,
    verifyOtpValidator,
} from '../validators/auth.validator.js';

const router = express.Router();

router.use(authRateLimiter);

router.post("/register", validate(registerValidator), authController.register);
router.post("/login", validate(loginValidator), authController.login);
router.post("/google", validate(googleLoginValidator), authController.googleLogin);
router.post("/refresh", authController.refreshAccessToken);
router.post("/refresh-token", authController.refreshAccessToken);
router.post("/verify-otp", validate(verifyOtpValidator), authController.verifyOtp);
router.post("/resend-otp", validate(resendOtpValidator), authController.resendOtp);
router.post("/forgot-password", validate(forgotPasswordValidator), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordValidator), authController.resetPassword);
router.post("/logout", authController.logout);
router.post("/logout-all", protect, authController.logoutAll);
router.get("/me", protect, authController.getMe);
router.get("/get-me", protect, authController.getMe);

export default router;
