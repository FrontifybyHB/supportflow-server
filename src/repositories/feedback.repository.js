import mongoose from "mongoose";
import Ticket from "../models/ticket.model.js";
import FeedbackRepositoryContract from "../contracts/feedback.repository.contract.js";

class FeedbackRepository extends FeedbackRepositoryContract {
  constructor(model = Ticket) {
    super();
    this.model = model;
  }

  async findTicketForTokenGeneration(
    ticketId,
    businessId,
    { allowCrossTenant = false } = {}
  ) {
    const filter = { _id: ticketId };
    if (!allowCrossTenant) filter.businessId = businessId;

    return this.model
      .findOne(filter)
      .select("+feedbackTokenHash +feedbackTokenExpiresAt businessId customer subject status priority category isHandoff assignedAgent source feedback createdAt updatedAt")
      .lean();
  }

  async setFeedbackToken(ticketId, tokenHash, expiresAt) {
    return this.model
      .findByIdAndUpdate(
        ticketId,
        {
          feedbackTokenHash: tokenHash,
          feedbackTokenExpiresAt: expiresAt,
        },
        { returnDocument: "after", runValidators: true }
      )
      .select("+feedbackTokenExpiresAt businessId status priority category isHandoff assignedAgent source feedback updatedAt")
      .lean();
  }

  async findByFeedbackTokenHash(tokenHash) {
    return this.model
      .findOne({ feedbackTokenHash: tokenHash })
      .select("+feedbackTokenHash +feedbackTokenExpiresAt businessId customer subject status priority category isHandoff assignedAgent source feedback createdAt updatedAt")
      .lean();
  }

  async submitFeedbackByTokenHash(tokenHash, feedback) {
    return this.model
      .findOneAndUpdate(
        {
          feedbackTokenHash: tokenHash,
          feedback: { $exists: false },
          $or: [
            { feedbackTokenExpiresAt: { $exists: false } },
            { feedbackTokenExpiresAt: { $gt: new Date() } },
          ],
        },
        {
          $set: { feedback },
          $unset: {
            feedbackTokenHash: "",
            feedbackTokenExpiresAt: "",
          },
        },
        { returnDocument: "after", runValidators: true }
      )
      .select("businessId customer subject status priority category isHandoff assignedAgent source feedback updatedAt")
      .lean();
  }

  async getAnalytics({
    businessId,
    allowCrossTenant = false,
    dateFrom,
    dateTo,
    feedbackType,
    category,
  } = {}) {
    const match = { feedback: { $exists: true } };

    if (!allowCrossTenant) {
      match.businessId = this.toObjectId(businessId);
    } else if (businessId) {
      match.businessId = this.toObjectId(businessId);
    }

    if (dateFrom || dateTo) {
      match["feedback.submittedAt"] = {};
      if (dateFrom) match["feedback.submittedAt"].$gte = new Date(dateFrom);
      if (dateTo) match["feedback.submittedAt"].$lte = new Date(dateTo);
    }

    if (feedbackType) match["feedback.feedbackType"] = feedbackType;
    if (category) match.category = category;

    const [result] = await this.model.aggregate([
      { $match: match },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalFeedback: { $sum: 1 },
                averageRating: { $avg: "$feedback.rating" },
                resolvedCount: {
                  $sum: { $cond: ["$feedback.resolved", 1, 0] },
                },
                satisfiedCount: {
                  $sum: { $cond: [{ $gte: ["$feedback.rating", 4] }, 1, 0] },
                },
              },
            },
          ],
          byType: [
            {
              $group: {
                _id: "$feedback.feedbackType",
                totalFeedback: { $sum: 1 },
                averageRating: { $avg: "$feedback.rating" },
                resolvedCount: {
                  $sum: { $cond: ["$feedback.resolved", 1, 0] },
                },
                satisfiedCount: {
                  $sum: { $cond: [{ $gte: ["$feedback.rating", 4] }, 1, 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
          byCategory: [
            {
              $group: {
                _id: "$category",
                totalFeedback: { $sum: 1 },
                averageRating: { $avg: "$feedback.rating" },
                resolvedCount: {
                  $sum: { $cond: ["$feedback.resolved", 1, 0] },
                },
                satisfiedCount: {
                  $sum: { $cond: [{ $gte: ["$feedback.rating", 4] }, 1, 0] },
                },
              },
            },
            { $sort: { averageRating: 1 } },
          ],
        },
      },
    ]);

    return this.formatAnalytics(result);
  }

  formatAnalytics(result = {}) {
    const overview = result.overview?.[0] || {
      totalFeedback: 0,
      averageRating: 0,
      resolvedCount: 0,
      satisfiedCount: 0,
    };

    return {
      overview: this.formatGroup(overview),
      byType: (result.byType || []).map((item) => ({
        feedbackType: item._id,
        ...this.formatGroup(item),
      })),
      byCategory: (result.byCategory || []).map((item) => ({
        category: item._id || "other",
        ...this.formatGroup(item),
      })),
    };
  }

  formatGroup(group) {
    const total = group.totalFeedback || 0;

    return {
      totalFeedback: total,
      averageRating: Number((group.averageRating || 0).toFixed(2)),
      csatScore: total
        ? Number(((group.satisfiedCount / total) * 100).toFixed(2))
        : 0,
      resolutionRate: total
        ? Number(((group.resolvedCount / total) * 100).toFixed(2))
        : 0,
    };
  }

  toObjectId(id) {
    if (!id) return id;
    return mongoose.Types.ObjectId.isValid(String(id))
      ? new mongoose.Types.ObjectId(String(id))
      : id;
  }
}

export default FeedbackRepository;
