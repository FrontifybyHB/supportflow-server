import AIModel from "../models/aiModel.model.js";
import Business from "../models/business.model.js";
import AIModelRepositoryContract from "../contracts/aiModel.repository.contract.js";

class AIModelRepository extends AIModelRepositoryContract {
  constructor(model = AIModel) {
    super();
    this.model = model;
  }

  async findAll(filters = {}) {
    return this.model
      .find(filters)
      .select("name provider description endpoint isActive isDefault config createdAt updatedAt")
      .sort({
        isDefault: -1,
        createdAt: -1,
      })
      .lean();
  }

  async findById(id) {
    return this.model
      .findById(id)
      .select("name provider description endpoint isActive isDefault config createdAt updatedAt")
      .lean();
  }

  async create(data) {
    const model = await this.model.create(data);
    const result = model.toObject();
    delete result.apiKey;
    return result;
  }

  async update(id, updates) {
    return this.model
      .findByIdAndUpdate(id, updates, {
        returnDocument: "after",
        runValidators: true,
      })
      .select("name provider description endpoint isActive isDefault config createdAt updatedAt")
      .lean();
  }

  async delete(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  async getActiveDefault() {
    return this.model
      .findOne({ isActive: true, isDefault: true })
      .select("+apiKey name provider description endpoint isActive isDefault config")
      .lean();
  }

  async getBusinessActiveModel(businessId) {
    const business = await Business.findById(businessId)
      .select("activeAIModel isActive")
      .lean();

    if (business?.isActive && business.activeAIModel) {
      const selectedModel = await this.model
        .findOne({ _id: business.activeAIModel, isActive: true })
        .select("+apiKey name provider description endpoint isActive isDefault config")
        .lean();

      if (selectedModel?.apiKey) {
        return { model: selectedModel, source: "business" };
      }
    }

    const defaultModel = await this.getActiveDefault();
    if (defaultModel?.apiKey) {
      return { model: defaultModel, source: "platform_default" };
    }

    return { model: this.resolveLegacyEnvModel(), source: "legacy_env" };
  }

  resolveLegacyEnvModel() {
    const provider = process.env.AI_PROVIDER?.trim().toLowerCase();

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return {
        provider: "openai",
        name: process.env.OPENAI_MODEL || "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: process.env.OPENAI_ENDPOINT || "",
        config: {
          maxTokens: Number(process.env.AI_MAX_TOKENS) || 700,
          temperature: Number(process.env.AI_TEMPERATURE) || 0.2,
        },
      };
    }

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      return {
        provider: "gemini",
        name: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
        endpoint: process.env.GEMINI_ENDPOINT || "",
        config: {
          maxTokens: Number(process.env.AI_MAX_TOKENS) || 700,
          temperature: Number(process.env.AI_TEMPERATURE) || 0.2,
        },
      };
    }

    throw new Error("No active AI model configured");
  }

  async setDefault(id) {
    await this.model.updateMany({}, { isDefault: false });
    return this.model.findByIdAndUpdate(
      id,
      { isDefault: true, isActive: true },
      { returnDocument: "after", runValidators: true }
    )
      .select("name provider description endpoint isActive isDefault config createdAt updatedAt")
      .lean();
  }
}

export default AIModelRepository;
