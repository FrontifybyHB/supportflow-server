import Business from "../models/business.model.js";
import AIModel from "../models/aiModel.model.js";
import BusinessAIRepositoryContract from "../contracts/businessAi.repository.contract.js";

class BusinessAIRepository extends BusinessAIRepositoryContract {
  constructor(businessModel = Business, aiModel = AIModel) {
    super();
    this.businessModel = businessModel;
    this.aiModel = aiModel;
  }

  async findActiveModels() {
    return this.aiModel
      .find({ isActive: true })
      .select("name provider description isDefault config createdAt updatedAt")
      .sort({ isDefault: -1, provider: 1, name: 1 })
      .lean();
  }

  async findBusinessById(businessId) {
    return this.businessModel
      .findById(businessId)
      .select("name isActive activeAIModel")
      .lean();
  }

  async findModelById(modelId) {
    return this.aiModel
      .findById(modelId)
      .select("name provider description isActive isDefault config createdAt updatedAt")
      .lean();
  }

  async findModelByIdWithSecret(modelId) {
    return this.aiModel
      .findById(modelId)
      .select("+apiKey name provider description endpoint isActive isDefault config")
      .lean();
  }

  async getActiveDefaultWithSecret() {
    return this.aiModel
      .findOne({ isActive: true, isDefault: true })
      .select("+apiKey name provider description endpoint isActive isDefault config")
      .lean();
  }

  async updateBusinessActiveModel(businessId, modelId) {
    return this.businessModel
      .findByIdAndUpdate(
        businessId,
        { activeAIModel: modelId },
        { returnDocument: "after", runValidators: true }
      )
      .select("name isActive activeAIModel updatedAt")
      .lean();
  }
}

export default BusinessAIRepository;
