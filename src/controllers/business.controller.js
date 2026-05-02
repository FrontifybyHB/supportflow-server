import businessService from "../services/business.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { success } from "../utils/response.js";

class BusinessController {
    constructor(service = businessService) {
        this.businessService = service;
    }

    createBusiness = asyncHandler(async (req, res) => {
        const result = await this.businessService.createBusinessForUser(
            req.user._id,
            req.body
        );
        return success(res, result, 201);
    });

    getMyBusiness = asyncHandler(async (req, res) => {
        const business = await this.businessService.getBusinessById(req.businessId);
        return success(res, { business });
    });

    updateMyBusiness = asyncHandler(async (req, res) => {
        const business = await this.businessService.updateBusiness(req.businessId, req.body);
        return success(res, { business });
    });

    getStats = asyncHandler(async (req, res) => {
        const stats = await this.businessService.getStats(req.businessId);
        return success(res, { stats });
    });
}

const businessController = new BusinessController();
export default businessController;
