import appError from '../utils/appError.js';
import { verifyAccessToken } from "../utils/tokens.js";
import userRepository from "../repositories/user.repository.js";
import businessRepository from "../repositories/business.repository.js";

/**
 * Protect middleware
 * Checks if user is authenticated using an access token.
 */
export const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(
                appError("You are not logged in. Please log in to continue.", 401)
            );
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);

        const user = await userRepository.findById(decoded.userId);

        if (!user) {
            return next(
                appError("The user belonging to this token no longer exists.", 401)
            );
        }

        if (!user.isActive) {
            return next(appError("Account is deactivated", 401));
        }

        req.user = user;

        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return next(appError("Invalid token. Please log in again.", 401));
        }

        if (error.name === "TokenExpiredError") {
            const err = appError("Access token expired", 401);
            err.code = "AT_EXPIRED";
            return next(err);
        }

        next(error);
    }
};

export const protectVerifiedCustomer = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : req.body?.customerToken;

        if (!token) {
            return next(appError("Customer email verification is required", 401));
        }

        const decoded = verifyAccessToken(token);

        if (!decoded.customerId || decoded.role !== "customer") {
            return next(appError("Invalid customer token", 401));
        }

        if (!decoded.isEmailVerified) {
            return next(appError("Please verify your email before continuing", 403));
        }

        const requestBusinessId = req.body?.businessId || req.query?.businessId;
        if (requestBusinessId && String(decoded.businessId) !== String(requestBusinessId)) {
            return next(appError("Customer token does not match this business", 403));
        }

        const requestCustomerEmail = req.body?.customerEmail;
        if (
            requestCustomerEmail &&
            String(requestCustomerEmail).trim().toLowerCase() !== String(decoded.email).toLowerCase()
        ) {
            return next(appError("Customer email does not match verified token", 403));
        }

        if (decoded.email && req.body) {
            req.body.customerEmail = decoded.email;
        }

        if (req.body?.customerToken) {
            delete req.body.customerToken;
        }

        req.customer = decoded;
        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return next(appError("Invalid customer token", 401));
        }

        if (error.name === "TokenExpiredError") {
            return next(appError("Customer token expired", 401));
        }

        next(error);
    }
};

export const requireVerified = (req, res, next) => {
    if (!req.user?.isEmailVerified) {
        return next(appError("Please verify your email before continuing", 403));
    }
    next();
};

export const requireTenant = (req, res, next) => {
    if (!req.user?.businessId) {
        return next(appError("This endpoint requires a business-scoped account", 403));
    }

    req.businessId = req.user.businessId;
    next();
};

export const requireRole = (minRole) => {
    const roleHierarchy = {
        customer: 0,
        agent: 1,
        admin: 2,
        superadmin: 3,
    };

    return (req, res, next) => {
        const userLevel = roleHierarchy[req.user?.role] ?? -1;
        const requiredLevel = roleHierarchy[minRole] ?? 99;

        if (userLevel < requiredLevel) {
            return next(appError(`This action requires ${minRole} role or higher`, 403));
        }

        next();
    };
};

export const restrictTo = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return next(appError("You do not have permission to perform this action", 403));
    }

    return next();
};

export const requireActiveBusiness = async (req, res, next) => {
    try {
        if (!req.businessId) {
            return next(appError("Business scope is required", 403));
        }

        const business = await businessRepository.findActiveStatusById(req.businessId);

        if (!business || !business.isActive) {
            return next(appError("Business is inactive", 403));
        }

        next();
    } catch (error) {
        next(error);
    }
};
