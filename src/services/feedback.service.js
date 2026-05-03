import crypto from "crypto";
import appError from "../utils/appError.js";
import logger from "../loggers/winston.logger.js";
import config from "../config/config.js";
import FeedbackRepository from "../repositories/feedback.repository.js";

const FEEDBACK_TOKEN_BYTES = 32;
const DEFAULT_TOKEN_TTL_DAYS = 14;
const FEEDBACK_ALLOWED_STATUSES = new Set(["resolved", "closed"]);

class FeedbackService {
  constructor(repository = new FeedbackRepository()) {
    this.repository = repository;
  }

  async generateFeedbackToken(user, ticketId, options = {}) {
    const ticket = await this.repository.findTicketForTokenGeneration(
      ticketId,
      user.businessId,
      { allowCrossTenant: user.role === "superadmin" }
    );
    if (!ticket) throw appError("Ticket not found", 404);

    this.ensureFeedbackCanBeRequested(ticket);

    const token = crypto.randomBytes(FEEDBACK_TOKEN_BYTES).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = this.buildExpiry(options.expiresInDays);
    await this.repository.setFeedbackToken(ticket._id, tokenHash, expiresAt);

    logger.info(`Feedback token generated for ticket: ${ticket._id}`);

    return {
      ticketId: ticket._id,
      feedbackType: this.determineFeedbackType(ticket),
      expiresAt,
      token,
      submitUrl: `/api/feedback/${token}`,
      feedbackUrl: `${config.FRONTEND_URL}/feedback/${token}`,
    };
  }

  async submitFeedback(token, feedbackInput) {
    const tokenHash = this.hashToken(token);
    const ticket = await this.repository.findByFeedbackTokenHash(tokenHash);
    if (!ticket) throw appError("Invalid or expired feedback token", 404);

    this.ensureFeedbackCanBeSubmitted(ticket);

    const feedback = {
      rating: Number(feedbackInput.rating),
      resolved: Boolean(feedbackInput.resolved),
      comment: feedbackInput.comment || "",
      feedbackType: this.determineFeedbackType(ticket),
      submittedAt: new Date(),
    };

    const updatedTicket = await this.repository.submitFeedbackByTokenHash(
      tokenHash,
      feedback
    );
    if (!updatedTicket) {
      throw appError("Feedback has already been submitted or token expired", 409);
    }

    logger.info(
      `Feedback submitted: ticket=${updatedTicket._id}, type=${feedback.feedbackType}, rating=${feedback.rating}`
    );

    return {
      ticketId: updatedTicket._id,
      priority: updatedTicket.priority,
      category: updatedTicket.category,
      feedback: updatedTicket.feedback,
    };
  }

  async getAnalytics(user, query = {}) {
    const allowCrossTenant = user.role === "superadmin";
    const businessId = allowCrossTenant
      ? query.businessId
      : user.businessId;

    if (!allowCrossTenant && !businessId) {
      throw appError("Business context is required", 403);
    }

    const data = await this.repository.getAnalytics({
      businessId,
      allowCrossTenant,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      feedbackType: query.feedbackType,
      category: query.category,
    });

    return {
      filters: {
        businessId: businessId || "all",
        dateFrom: query.dateFrom || null,
        dateTo: query.dateTo || null,
        feedbackType: query.feedbackType || null,
        category: query.category || null,
      },
      ...data,
    };
  }

  ensureFeedbackCanBeRequested(ticket) {
    if (!FEEDBACK_ALLOWED_STATUSES.has(ticket.status)) {
      throw appError("Feedback can only be requested for resolved or closed tickets", 400);
    }

    if (ticket.feedback) {
      throw appError("Feedback has already been submitted for this ticket", 409);
    }
  }

  ensureFeedbackCanBeSubmitted(ticket) {
    if (!FEEDBACK_ALLOWED_STATUSES.has(ticket.status)) {
      throw appError("Feedback can only be submitted for resolved or closed tickets", 400);
    }

    if (ticket.feedback) {
      throw appError("Feedback has already been submitted for this ticket", 409);
    }

    if (
      ticket.feedbackTokenExpiresAt &&
      new Date(ticket.feedbackTokenExpiresAt).getTime() < Date.now()
    ) {
      throw appError("Feedback token has expired", 410);
    }
  }

  determineFeedbackType(ticket) {
    if (ticket.source === "chat" && ticket.isHandoff === false) return "ai";
    return "agent";
  }

  hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  buildExpiry(expiresInDays = DEFAULT_TOKEN_TTL_DAYS) {
    const safeDays = Math.min(Math.max(Number(expiresInDays) || DEFAULT_TOKEN_TTL_DAYS, 1), 90);
    return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);
  }
}

const feedbackService = new FeedbackService();
export default feedbackService;
