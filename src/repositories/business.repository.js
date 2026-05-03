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
      .select("name ownerId plan isActive activeAIModel usage createdAt updatedAt")
      .lean();
  }

  async updateStatus(id, isActive) {
    return this.model.findByIdAndUpdate(
      id,
      { isActive },
      { returnDocument: "after", runValidators: true }
    )
      .select("name ownerId plan isActive usage createdAt updatedAt")
      .lean();
  }

  async updatePlan(id, plan) {
    return this.model.findByIdAndUpdate(
      id,
      { plan },
      { returnDocument: "after", runValidators: true }
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
      { returnDocument: "after", runValidators: true }
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

  async getBusinessKnowledge(businessId, message = "", limit = 3) {
    const db = mongoose.connection.db;
    if (!db) return [];

    const keywords = this.extractKeywords(message);
    const businessStringId = String(businessId);
    const businessIds = [businessStringId];
    if (this.isValidId(businessStringId)) {
      businessIds.push(new mongoose.Types.ObjectId(businessStringId));
    }
    const query = {
      businessId: { $in: businessIds },
      isActive: { $ne: false },
    };

    const entries = await db
      .collection("knowledgebases")
      .find(query)
      .project({ title: 1, content: 1, answer: 1, body: 1, tags: 1, updatedAt: 1 })
      .limit(25)
      .toArray();

    return entries
      .map((entry) => ({
        ...entry,
        relevanceScore: this.scoreKnowledgeEntry(entry, keywords),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  extractKeywords(message = "") {
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "with",
      "you",
      "your",
      "are",
      "what",
      "how",
      "can",
      "that",
      "this",
      "from",
      "have",
      "need",
    ]);

    return String(message)
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 12) || [];
  }

  scoreKnowledgeEntry(entry, keywords) {
    if (!keywords.length) return 0;

    const searchableText = [
      entry.title,
      entry.content,
      entry.answer,
      entry.body,
      Array.isArray(entry.tags) ? entry.tags.join(" ") : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return keywords.reduce((score, keyword) => {
      return searchableText.includes(keyword) ? score + 1 : score;
    }, 0);
  }

  isValidId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }
}

export default BusinessRepository;
