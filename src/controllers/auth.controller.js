import asyncHandler from "../utils/asyncHandler.js";
import appError from "../utils/appError.js";
import { REFRESH_TOKEN_COOKIE } from "../constants/constants.js";
import customerService from "../services/customer.service.js";
import userService from "../services/user.service.js";
import { success } from "../utils/response.js";
import { clearRefreshCookie, setRefreshCookie } from "../utils/tokens.js";

class AuthController {
    constructor(service = userService, customerAuthService = customerService) {
        this.userService = service;
        this.customerService = customerAuthService;
    }

    register = asyncHandler(async (req, res) => {
        const result = await this.userService.register(req.body, req);
        setRefreshCookie(res, result.refreshToken);

        return success(res, {
            userId: result.user._id,
            message: result.message,
        }, 201);
    });

    login = asyncHandler(async (req, res) => {
        const result = await this.userService.login(req.body.email, req.body.password, req);

        if (result.needsVerification) {
            return success(res, result);
        }

        setRefreshCookie(res, result.refreshToken);
        return success(res, {
            accessToken: result.accessToken,
            user: result.user,
        });
    });

    googleLogin = asyncHandler(async (req, res) => {
        const result = await this.userService.googleLogin(req.body, req);
        setRefreshCookie(res, result.refreshToken);

        return success(res, {
            accessToken: result.accessToken,
            user: result.user,
        });
    });

    refreshAccessToken = asyncHandler(async (req, res) => {
        const result = await this.userService.refreshAccessToken(
            req.cookies?.[REFRESH_TOKEN_COOKIE],
            req
        );

        setRefreshCookie(res, result.refreshToken);
        return success(res, {
            accessToken: result.accessToken,
            user: result.user,
        });
    });

    verifyOtp = asyncHandler(async (req, res) => {
        const result = await this.userService.verifyOtp(req.body, req);

        if (result.refreshToken) {
            setRefreshCookie(res, result.refreshToken);
        }

        return success(res, {
            accessToken: result.accessToken,
            user: result.user,
            message: "OTP verified successfully",
        });
    });

    resendOtp = asyncHandler(async (req, res) => {
        const result = await this.userService.resendOtp(req.body.userId);
        return success(res, result);
    });

    requestCustomerEmailOtp = asyncHandler(async (req, res) => {
        const result = await this.customerService.requestEmailVerification(req.body);
        return success(res, result, 201);
    });

    verifyCustomerEmailOtp = asyncHandler(async (req, res) => {
        const result = await this.customerService.verifyEmailOtp(req.body);
        return success(res, result);
    });

    forgotPassword = asyncHandler(async (req, res) => {
        const result = await this.userService.forgotPassword(req.body.email);
        return success(res, result);
    });

    resetPassword = asyncHandler(async (req, res) => {
        const result = await this.userService.resetPassword(req.body);
        clearRefreshCookie(res);
        return success(res, result);
    });

    logout = asyncHandler(async (req, res) => {
        const result = await this.userService.logout(req.cookies?.[REFRESH_TOKEN_COOKIE]);
        clearRefreshCookie(res);
        return success(res, result);
    });

    logoutAll = asyncHandler(async (req, res, next) => {
        if (!req.user?._id) {
            return next(appError("Unauthorized", 401));
        }

        const result = await this.userService.logoutAll(req.user._id);
        clearRefreshCookie(res);
        return success(res, result);
    });

    getMe = asyncHandler(async (req, res) => {
        const user = await this.userService.getMe(req.user._id);
        return success(res, { user });
    });
}

const authController = new AuthController();
export default authController;
