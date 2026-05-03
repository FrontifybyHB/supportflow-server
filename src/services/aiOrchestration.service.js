import logger from "../loggers/winston.logger.js";
import appError from "../utils/appError.js";
import { BusinessRepository } from "../repositories/business.repository.js";
import aiClassificationService from "./aiClassification.service.js";
import aiSafetyService from "./aiSafety.service.js";

const DEMO_COST_PER_1K_TOKENS = 0.002;
const HANDOFF_REPLY = "An agent will assist you shortly";

class AIOrchestrationService {
  constructor(
    businessRepository = new BusinessRepository(),
    classificationService = aiClassificationService,
    safetyService = aiSafetyService
  ) {
    this.businessRepository = businessRepository;
    this.classificationService = classificationService;
    this.safetyService = safetyService;
  }

  async classifyAndHandle(message, conversationHistory = [], businessId) {
    const business = await this.getActiveBusiness(businessId);
    const classification = await this.classificationService.classify(
      message,
      conversationHistory,
      businessId
    );

    await this.updateBusinessUsage(businessId, classification.tokensUsed || 0);

    if (classification.shouldHandoff) {
      return this.buildHandoffResult(classification, classification.reason);
    }

    try {
      const knowledgeEntries = await this.businessRepository.getBusinessKnowledge(
        businessId,
        message,
        3
      );
      const replyResult = await this.classificationService.generateReply(
        message,
        conversationHistory,
        knowledgeEntries,
        businessId,
        business?.name || "the business"
      );

      await this.updateBusinessUsage(businessId, replyResult.tokensUsed || 0);

      const safetyResult = this.safetyService.filterBadWords(replyResult.reply);
      if (safetyResult.flagged) {
        logger.warn(
          `AI reply blocked by bad word filter: businessId=${businessId}`
        );
        return this.buildHandoffResult(
          classification,
          "AI safety filter flagged the generated reply."
        );
      }

      const hallucination = this.safetyService.detectHallucination(
        safetyResult.sanitized
      );
      const handoffOnHallucination =
        process.env.AI_HANDOFF_ON_HALLUCINATION !== "false";
      if (handoffOnHallucination && hallucination.isHallucination) {
        logger.warn(
          `AI reply blocked by hallucination guard: businessId=${businessId}, reason=${hallucination.reason}`
        );
        return this.buildHandoffResult(classification, hallucination.reason);
      }

      const reply = this.safetyService.truncateReply(safetyResult.sanitized, 1000);

      return {
        handoff: false,
        reply,
        priority: classification.priority,
        category: classification.category,
        confidence: classification.confidence,
        reason: classification.reason,
        tokensUsed:
          (classification.tokensUsed || 0) + (replyResult.tokensUsed || 0),
        classificationTokensUsed: classification.tokensUsed || 0,
        replyTokensUsed: replyResult.tokensUsed || 0,
        costEstimate: this.calculateCost(
          (classification.tokensUsed || 0) + (replyResult.tokensUsed || 0)
        ),
        provider: replyResult.provider,
        model: replyResult.model,
        modelSource: replyResult.modelSource,
      };
    } catch (error) {
      logger.error(`AI reply generation failed; handing off: ${error.message}`);
      return this.buildHandoffResult(
        classification,
        "AI reply generation failed."
      );
    }
  }

  async getActiveBusiness(businessId) {
    const business = await this.businessRepository.findById(businessId);
    if (!business || !business.isActive) {
      throw appError("Business not found or inactive", 404);
    }

    return business;
  }

  async generateAIResponse(message, businessId, conversationId = null) {
    return this.classifyAndHandle(
      message,
      conversationId ? [{ role: "system", content: `conversationId:${conversationId}` }] : [],
      businessId
    );
  }

  buildHandoffResult(classification, reason) {
    return {
      handoff: true,
      reply: HANDOFF_REPLY,
      priority: classification.priority || "Medium",
      category: classification.category || "other",
      confidence: classification.confidence || 0,
      reason,
      tokensUsed: classification.tokensUsed || 0,
      classificationTokensUsed: classification.tokensUsed || 0,
      replyTokensUsed: 0,
      costEstimate: this.calculateCost(classification.tokensUsed || 0),
      provider: classification.provider,
      model: classification.model,
      modelSource: classification.modelSource,
    };
  }

  async updateBusinessUsage(businessId, tokensUsed) {
    const safeTokens = Math.max(Number(tokensUsed) || 0, 0);
    try {
      await this.businessRepository.incrementUsage(businessId, {
        aiCalls: 1,
        tokensConsumed: safeTokens,
        costEstimate: this.calculateCost(safeTokens),
      });
    } catch (error) {
      logger.warn(
        `AI usage tracking failed: businessId=${businessId}, error=${error.message}`
      );
    }
  }

  calculateCost(tokensUsed) {
    return (Math.max(Number(tokensUsed) || 0, 0) / 1000) * DEMO_COST_PER_1K_TOKENS;
  }
}

const aiOrchestrationService = new AIOrchestrationService();

export const classifyAndHandle = (message, conversationHistory, businessId) =>
  aiOrchestrationService.classifyAndHandle(
    message,
    conversationHistory,
    businessId
  );

export const generateAIResponse = (message, businessId, conversationId) =>
  aiOrchestrationService.generateAIResponse(message, businessId, conversationId);

export default aiOrchestrationService;
