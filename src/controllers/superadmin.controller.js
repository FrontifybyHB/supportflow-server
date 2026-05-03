import superAdminService from "../services/superadmin.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { success } from "../utils/response.js";

class SuperAdminController {
    constructor(service = superAdminService) {
        this.superAdminService = service;
    }

    listBusinesses = asyncHandler(async (_req, res) => {
        const result = await this.superAdminService.listBusinesses();
        return success(res, result);
    });

    getBusiness = asyncHandler(async (req, res) => {
        const result = await this.superAdminService.getBusinessDetail(req.params.id);
        return success(res, result);
    });

    updateBusinessStatus = asyncHandler(async (req, res) => {
        const business = await this.superAdminService.updateBusinessStatus(
            req.params.id,
            req.body
        );
        return success(res, { business });
    });

    updateBusinessPlan = asyncHandler(async (req, res) => {
        const business = await this.superAdminService.updateBusinessPlan(
            req.params.id,
            req.body
        );
        return success(res, { business });
    });

    toggleBusiness = asyncHandler(async (req, res) => {
        const business = await this.superAdminService.toggleBusiness(req.params.id);
        return success(res, { business });
    });

    listUsers = asyncHandler(async (req, res) => {
        const result = await this.superAdminService.listUsers({
            page: req.query.page,
            limit: req.query.limit,
            role: req.query.role,
            businessId: req.query.businessId,
        });

        return success(res, {
            users: result.data,
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
        });
    });

    updateUserRole = asyncHandler(async (req, res) => {
        const user = await this.superAdminService.updateUserRole(
            req.params.id,
            req.body
        );
        return success(res, { user });
    });

    stats = asyncHandler(async (_req, res) => {
        const result = await this.superAdminService.stats();
        return success(res, result);
    });

    bootstrapSuperAdmin = asyncHandler(async (req, res) => {
        const result = await this.superAdminService.bootstrapSuperAdmin(req.body);
        return success(res, result, result.alreadyExists ? 200 : 201);
    });
}

const superAdminController = new SuperAdminController();
export default superAdminController;
