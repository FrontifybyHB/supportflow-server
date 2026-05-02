import AIModel from "../models/aiModel.model.js";
import AIModelRepositoryContract from "../contracts/aiModel.repository.contract.js";

class AIModelRepository extends AIModelRepositoryContract {
  constructor(model = AIModel) {
    super();
    this.model = model;
  }

  async findAll(filters = {}) {
    return this.model
      .find(filters)
      .select("name provider endpoint isActive isDefault config createdAt updatedAt")
      .sort({
        isDefault: -1,
        createdAt: -1,
      })
      .lean();
  }

  async findById(id) {
    return this.model
      .findById(id)
      .select("name provider endpoint isActive isDefault config createdAt updatedAt")
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
        new: true,
        runValidators: true,
      })
      .select("name provider endpoint isActive isDefault config createdAt updatedAt")
      .lean();
  }

  async delete(id) {
    return this.model.findByIdAndDelete(id).lean();
  }

  async getActiveDefault() {
    return this.model
      .findOne({ isActive: true, isDefault: true })
      .select("+apiKey name provider endpoint isActive isDefault config")
      .lean();
  }

  async setDefault(id) {
    await this.model.updateMany({}, { isDefault: false });
    return this.model.findByIdAndUpdate(
      id,
      { isDefault: true, isActive: true },
      { new: true, runValidators: true }
    )
      .select("name provider endpoint isActive isDefault config createdAt updatedAt")
      .lean();
  }
}

export default AIModelRepository;
