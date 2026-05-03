import User from "../models/user.model.js";
import appError from "../utils/appError.js";
import logger from "../loggers/winston.logger.js";
import Ticket from "../models/ticket.model.js";
import BusinessRepository from "../repositories/business.repository.js";
import AIModelRepository from "../repositories/aiModel.repository.js";
import aiClassificationService from "./aiClassification.service.js";

class SuperAdminService {
  constructor(
    businessRepository = new BusinessRepository(),
    aiModelRepository = new AIModelRepository(),
    classificationService = aiClassificationService
  ) {
    this.businessRepository = businessRepository;
    this.aiModelRepository = aiModelRepository;
    this.classificationService = classificationService;
  }

  async getPlatformStats() {
    const [businessStats, totalUsers, activeUsers, inactiveUsers, totalTickets] =
      await Promise.all([
        this.businessRepository.getAggregatedStats(),
        User.countDocuments(),
        User.countDocuments({ isActive: { $ne: false } }),
        User.countDocuments({ isActive: false }),
        this.countTickets(),
      ]);

    return {
      totalBusinesses: businessStats.totalBusinesses,
      activeBusinesses: businessStats.activeBusinesses,
      suspendedBusinesses: businessStats.suspendedBusinesses,
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalTickets,
      totalAiQueries: businessStats.totalAiCalls,
    };
  }

  async getUsageStats() {
    const [businessStats, usageByPlan] = await Promise.all([
      this.businessRepository.getAggregatedStats(),
      this.businessRepository.getUsageByPlan(),
    ]);

    return {
      aiApiCalls: businessStats.totalAiCalls,
      tokensConsumed: businessStats.totalTokensConsumed,
      costEstimate: businessStats.totalCostEstimate,
      usageByPlan,
    };
  }

  async listBusinesses(filters = {}) {
    const query = {};

    if (filters.plan) query.plan = filters.plan;
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === "true";
    }

    return this.businessRepository.findAll(query);
  }

  async getBusiness(id) {
    const business = await this.businessRepository.findById(id);
    if (!business) throw appError("Business not found", 404);
    return business;
  }

  async suspendBusiness(id) {
    const business = await this.businessRepository.updateStatus(id, false);
    if (!business) throw appError("Business not found", 404);
    logger.info(`Business suspended: ${id}`);
    return business;
  }

  async activateBusiness(id) {
    const business = await this.businessRepository.updateStatus(id, true);
    if (!business) throw appError("Business not found", 404);
    logger.info(`Business activated: ${id}`);
    return business;
  }

  async changeBusinessPlan(id, plan) {
    const business = await this.businessRepository.updatePlan(id, plan);
    if (!business) throw appError("Business not found", 404);
    logger.info(`Business plan changed: ${id} -> ${plan}`);
    return business;
  }

  async listUsers(filters = {}) {
    const query = {};

    if (filters.businessId) query.businessId = filters.businessId;
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive === "true";
    }

    return User.find(query)
      .select("-password -__v")
      .populate("businessId", "name plan isActive")
      .sort({ createdAt: -1 })
      .lean();
  }

  async getUser(id) {
    const user = await User.findById(id)
      .select("-password -__v")
      .populate("businessId", "name plan isActive")
      .lean();

    if (!user) throw appError("User not found", 404);
    return user;
  }

  async deactivateUser(id) {
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { returnDocument: "after", runValidators: true }
    )
      .select("-password -__v")
      .lean();

    if (!user) throw appError("User not found", 404);
    logger.info(`User deactivated: ${id}`);
    return user;
  }

  async reactivateUser(id) {
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: true },
      { returnDocument: "after", runValidators: true }
    )
      .select("-password -__v")
      .lean();

    if (!user) throw appError("User not found", 404);
    logger.info(`User reactivated: ${id}`);
    return user;
  }

  async listModels() {
    return this.aiModelRepository.findAll();
  }

  async getModel(id) {
    const model = await this.aiModelRepository.findById(id);
    if (!model) throw appError("AI model not found", 404);
    return model;
  }

  async createModel(modelData) {
    if (modelData.isDefault) {
      const model = await this.aiModelRepository.create({
        ...modelData,
        isActive: true,
      });
      await this.aiModelRepository.setDefault(model._id);
      this.classificationService.invalidateModelCache();
      logger.info(`AI model created and set as default: ${model._id}`);
      return this.aiModelRepository.findById(model._id);
    }

    const model = await this.aiModelRepository.create(modelData);
    logger.info(`AI model created: ${model._id}`);
    return model;
  }

  async updateModel(id, updates) {
    if (updates.isDefault) {
      delete updates.isDefault;
    }

    const model = await this.aiModelRepository.update(id, updates);
    if (!model) throw appError("AI model not found", 404);
    this.classificationService.invalidateModelCache();
    logger.info(`AI model updated: ${id}`);
    return model;
  }

  async setDefaultModel(id) {
    const existingModel = await this.aiModelRepository.findById(id);
    if (!existingModel) throw appError("AI model not found", 404);

    const model = await this.aiModelRepository.setDefault(id);
    this.classificationService.invalidateModelCache();
    logger.info(`Default AI model changed: ${id}`);
    return model;
  }

  async deleteModel(id) {
    const model = await this.aiModelRepository.findById(id);
    if (!model) throw appError("AI model not found", 404);
    if (model.isDefault) throw appError("Default AI model cannot be deleted", 400);

    await this.aiModelRepository.delete(id);
    this.classificationService.invalidateModelCache();
    logger.info(`AI model deleted: ${id}`);
    return true;
  }

  async countTickets() {
    try {
      return Ticket.countDocuments();
    } catch (error) {
      logger.error("Failed to count tickets", { error: error.message });
      return 0;
    }
  }
}

const superAdminService = new SuperAdminService();
export default superAdminService;
