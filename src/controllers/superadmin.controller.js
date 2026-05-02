import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import superAdminService from "../services/superadmin.service.js";

class SuperAdminController {
  constructor(service = superAdminService) {
    this.superAdminService = service;
  }

  getStats = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.getPlatformStats();
    res.status(200).json(ApiResponse.success(data, "Platform stats fetched"));
  });

  getUsage = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.getUsageStats();
    res.status(200).json(ApiResponse.success(data, "Usage stats fetched"));
  });

  listBusinesses = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.listBusinesses(req.query);
    res.status(200).json(ApiResponse.success(data, "Businesses fetched"));
  });

  getBusiness = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.getBusiness(req.params.id);
    res.status(200).json(ApiResponse.success(data, "Business fetched"));
  });

  suspendBusiness = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.suspendBusiness(req.params.id);
    res.status(200).json(ApiResponse.success(data, "Business suspended"));
  });

  activateBusiness = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.activateBusiness(req.params.id);
    res.status(200).json(ApiResponse.success(data, "Business activated"));
  });

  changeBusinessPlan = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.changeBusinessPlan(
      req.params.id,
      req.body.plan
    );
    res.status(200).json(ApiResponse.success(data, "Business plan changed"));
  });

  listUsers = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.listUsers(req.query);
    res.status(200).json(ApiResponse.success(data, "Users fetched"));
  });

  getUser = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.getUser(req.params.id);
    res.status(200).json(ApiResponse.success(data, "User fetched"));
  });

  deactivateUser = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.deactivateUser(req.params.id);
    res.status(200).json(ApiResponse.success(data, "User deactivated"));
  });

  reactivateUser = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.reactivateUser(req.params.id);
    res.status(200).json(ApiResponse.success(data, "User reactivated"));
  });

  listModels = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.listModels();
    res.status(200).json(ApiResponse.success(data, "AI models fetched"));
  });

  getModel = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.getModel(req.params.id);
    res.status(200).json(ApiResponse.success(data, "AI model fetched"));
  });

  createModel = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.createModel(req.body);
    res.status(201).json(ApiResponse.success(data, "AI model created", 201));
  });

  updateModel = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.updateModel(req.params.id, req.body);
    res.status(200).json(ApiResponse.success(data, "AI model updated"));
  });

  setDefaultModel = asyncHandler(async (req, res) => {
    const data = await this.superAdminService.setDefaultModel(req.params.id);
    res.status(200).json(ApiResponse.success(data, "Default AI model changed"));
  });

  deleteModel = asyncHandler(async (req, res) => {
    await this.superAdminService.deleteModel(req.params.id);
    res.status(200).json(ApiResponse.success({ deleted: true }, "AI model deleted"));
  });
}

const superAdminController = new SuperAdminController();
export default superAdminController;
