/* eslint-disable no-unused-vars */

class BusinessAIRepositoryContract {
  async findActiveModels() {
    throw new Error("Method not implemented: findActiveModels");
  }

  async findBusinessById(_businessId) {
    throw new Error("Method not implemented: findBusinessById");
  }

  async findModelById(_modelId) {
    throw new Error("Method not implemented: findModelById");
  }

  async findModelByIdWithSecret(_modelId) {
    throw new Error("Method not implemented: findModelByIdWithSecret");
  }

  async getActiveDefaultWithSecret() {
    throw new Error("Method not implemented: getActiveDefaultWithSecret");
  }

  async updateBusinessActiveModel(_businessId, _modelId) {
    throw new Error("Method not implemented: updateBusinessActiveModel");
  }
}

export default BusinessAIRepositoryContract;
