import mongoose from "mongoose";
import Business from "../models/business.model.js";
import BusinessRepositoryContract from "../contracts/business.repository.contract.js";

class BusinessRepository extends BusinessRepositoryContract {
  constructor(model = Business) {
    super();
    this.model = model;
  }

  async findAll(filters = {}) {
    return this.model
      .find(filters)
      .select("name ownerId plan isActive usage createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id) {
    return this.model
      .findById(id)
      .select("name ownerId plan isActive usage createdAt updatedAt")
      .lean();
  }

  async updateStatus(id, isActive) {
    return this.model.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    )
      .select("name ownerId plan isActive usage createdAt updatedAt")
      .lean();
  }

  async updatePlan(id, plan) {
    return this.model.findByIdAndUpdate(
      id,
      { plan },
      { new: true, runValidators: true }
    )
      .select("name ownerId plan isActive usage createdAt updatedAt")
      .lean();
  }

  async incrementUsage(id, usage) {
    return this.model.findByIdAndUpdate(
      id,
      {
        $inc: {
          "usage.aiCalls": usage.aiCalls || 0,
          "usage.tokensConsumed": usage.tokensConsumed || 0,
          "usage.costEstimate": usage.costEstimate || 0,
        },
      },
      { new: true, runValidators: true }
    )
      .select("name ownerId plan isActive usage createdAt updatedAt")
      .lean();
  }

  async getAggregatedStats() {
    const [stats] = await this.model.aggregate([
      {
        $group: {
          _id: null,
          totalBusinesses: { $sum: 1 },
          activeBusinesses: {
            $sum: { $cond: ["$isActive", 1, 0] },
          },
          suspendedBusinesses: {
            $sum: { $cond: ["$isActive", 0, 1] },
          },
          totalAiCalls: { $sum: "$usage.aiCalls" },
          totalTokensConsumed: { $sum: "$usage.tokensConsumed" },
          totalCostEstimate: { $sum: "$usage.costEstimate" },
        },
      },
    ]);

    return (
      stats || {
        totalBusinesses: 0,
        activeBusinesses: 0,
        suspendedBusinesses: 0,
        totalAiCalls: 0,
        totalTokensConsumed: 0,
        totalCostEstimate: 0,
      }
    );
  }

  async getUsageByPlan() {
    return this.model.aggregate([
      {
        $group: {
          _id: "$plan",
          businesses: { $sum: 1 },
          aiCalls: { $sum: "$usage.aiCalls" },
          tokensConsumed: { $sum: "$usage.tokensConsumed" },
          costEstimate: { $sum: "$usage.costEstimate" },
        },
      },
      {
        $project: {
          _id: 0,
          plan: "$_id",
          businesses: 1,
          aiCalls: 1,
          tokensConsumed: 1,
          costEstimate: 1,
        },
      },
    ]);
  }

  isValidId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }
}

export default BusinessRepository;
