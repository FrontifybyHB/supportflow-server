import mongoose from "mongoose";

import appError from "../utils/appError.js";
import logger from "../loggers/winston.logger.js";
import BusinessAIRepository from "../repositories/businessAi.repository.js";
import aiClassificationService from "./aiClassification.service.js";

class BusinessAIService {
  constructor(
    repository = new BusinessAIRepository(),
    classificationService = aiClassificationService
  ) {
    this.repository = repository;
    this.classificationService = classificationService;
  }

  async listAvailableModels() {
    const models = await this.repository.findActiveModels();
    return models.map((model) => this.toPublicModel(model));
  }

  async getSelection(businessId) {
    if (!businessId) {
      const defaultModel = await this.repository.getActiveDefaultWithSecret();
      return {
        businessId: null,
        source: "platform_default",
        model: defaultModel ? this.toPublicModel(defaultModel) : null,
      };
    }

    this.assertObjectId(businessId, "Valid businessId is required");

    const business = await this.getActiveBusiness(businessId);
    const selectedModel = business.activeAIModel
      ? await this.repository.findModelById(business.activeAIModel)
      : null;

    if (selectedModel?.isActive) {
      return {
        businessId,
        source: "business",
        model: this.toPublicModel(selectedModel),
      };
    }

    const defaultModel = await this.repository.getActiveDefaultWithSecret();
    return {
      businessId,
      source: "platform_default",
      model: defaultModel ? this.toPublicModel(defaultModel) : null,
    };
  }

  async selectModel(businessId, modelId) {
    const model = await this.repository.findModelById(modelId);
    if (!model || !model.isActive) {
      throw appError("Active AI model not found", 404);
    }

    if (!businessId) {
      const defaultModel = await this.repository.setDefaultModel(modelId);
      this.classificationService.invalidateModelCache();

      logger.info(`Platform default AI model selected: ${modelId}`);

      return {
        businessId: null,
        source: "platform_default",
        activeAIModel: this.toPublicModel(defaultModel || model),
        updatedAt: defaultModel?.updatedAt,
      };
    }

    this.assertObjectId(businessId, "Valid businessId is required");
    await this.getActiveBusiness(businessId);

    const business = await this.repository.updateBusinessActiveModel(
      businessId,
      modelId
    );
    this.classificationService.invalidateModelCache(businessId);

    logger.info(`Business AI model selected: ${businessId} -> ${modelId}`);

    return {
      businessId: business._id,
      activeAIModel: this.toPublicModel(model),
      updatedAt: business.updatedAt,
    };
  }

  assertObjectId(value, message) {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw appError(message, 422);
    }
  }

  async getActiveBusiness(businessId) {
    const business = await this.repository.findBusinessById(businessId);
    if (!business || !business.isActive) {
      throw appError("Business not found or inactive", 404);
    }

    return business;
  }

  toPublicModel(model) {
    return {
      _id: model._id,
      name: model.name,
      provider: model.provider,
      description: model.description || this.buildDescription(model),
      isDefault: model.isDefault,
      config: model.config,
    };
  }

  buildDescription(model) {
    const providerNames = {
      openai: "OpenAI model managed by the platform",
      gemini: "Google Gemini model managed by the platform",
      custom: "Custom AI model managed by the platform",
    };

    return providerNames[model.provider] || "AI model managed by the platform";
  }
}

const businessAIService = new BusinessAIService();
export default businessAIService;
