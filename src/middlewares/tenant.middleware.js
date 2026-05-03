import appError from "../utils/appError.js";

const tenantMiddleware = (req, res, next) => {
  if (!req.user) return next();

  if (req.user.role === "superadmin") {
    return next();
  }

  if (!req.user.businessId) {
    return next(appError("Business context is required", 403));
  }

  req.businessId = req.user.businessId;
  return next();
};

export default tenantMiddleware;
