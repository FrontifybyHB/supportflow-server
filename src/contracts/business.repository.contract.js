/* eslint-disable no-unused-vars */

class BusinessRepositoryContract {
  async findAll(_filters) {
    throw new Error("Method not implemented: findAll");
  }

  async findById(_id) {
    throw new Error("Method not implemented: findById");
  }

  async updateStatus(_id, _isActive) {
    throw new Error("Method not implemented: updateStatus");
  }

  async updatePlan(_id, _plan) {
    throw new Error("Method not implemented: updatePlan");
  }

  async incrementUsage(_id, _usage) {
    throw new Error("Method not implemented: incrementUsage");
  }

  async getAggregatedStats() {
    throw new Error("Method not implemented: getAggregatedStats");
  }

  async getUsageByPlan() {
    throw new Error("Method not implemented: getUsageByPlan");
  }

  async getBusinessKnowledge(_businessId, _message, _limit) {
    throw new Error("Method not implemented: getBusinessKnowledge");
  }
}

export default BusinessRepositoryContract;
