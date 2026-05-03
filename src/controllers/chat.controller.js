import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import logger from "../loggers/winston.logger.js";
import aiOrchestrationService from "../services/aiOrchestration.service.js";
import ticketService from "../services/ticket.service.js";

const AI_UNAVAILABLE_RESULT = {
  handoff: true,
  reply: "An agent will assist you shortly",
  priority: "Medium",
  category: "other",
  confidence: 0,
  reason: "AI unavailable - manual review needed",
  tokensUsed: 0,
  classificationTokensUsed: 0,
  replyTokensUsed: 0,
  costEstimate: 0,
};

class ChatController {
  constructor(service = ticketService, aiService = aiOrchestrationService) {
    this.ticketService = service;
    this.aiService = aiService;
  }

  createMessage = asyncHandler(async (req, res) => {
    const { businessId, message } = req.body;
    const conversationHistory = await this.ticketService.getConversationHistory(
      req.body
    );
    const aiResult = await this.safeClassifyAndHandle(
      message,
      conversationHistory,
      businessId
    );
    const ticketPayload = {
      ...req.body,
      priority: aiResult.priority,
      category: aiResult.category,
      isHandoff: aiResult.handoff,
    };

    if (aiResult.handoff) {
      const data = await this.ticketService.createCustomerTicket(
        ticketPayload,
        req.app.get("io")
      );

      logger.info(
        `Chat routed to agent handoff by AI classification: priority=${aiResult.priority}, category=${aiResult.category}`
      );

      return res.status(201).json(
        ApiResponse.success(
          {
            reply: aiResult.reply,
            handoff: true,
            priority: aiResult.priority,
            category: aiResult.category,
            confidence: aiResult.confidence,
            reason: aiResult.reason,
            tokensUsed: aiResult.tokensUsed,
            costEstimate: aiResult.costEstimate,
            provider: aiResult.provider,
            model: aiResult.model,
            modelSource: aiResult.modelSource,
            ...data,
          },
          "Ticket created",
          201
        )
      );
    }

    const data = await this.ticketService.createAiResolvedTicket(
      ticketPayload,
      aiResult.reply,
      req.app.get("io")
    );

    return res.status(200).json(
      ApiResponse.success(
        {
          reply: aiResult.reply,
          handoff: false,
          priority: aiResult.priority,
          category: aiResult.category,
          confidence: aiResult.confidence,
          reason: aiResult.reason,
          tokensUsed: aiResult.tokensUsed,
          classificationTokensUsed: aiResult.classificationTokensUsed,
          replyTokensUsed: aiResult.replyTokensUsed,
          costEstimate: aiResult.costEstimate,
          provider: aiResult.provider,
          model: aiResult.model,
          modelSource: aiResult.modelSource,
          ...data,
        },
        "AI reply generated"
      )
    );
  });

  async safeClassifyAndHandle(message, conversationHistory, businessId) {
    try {
      return await this.aiService.classifyAndHandle(
        message,
        conversationHistory,
        businessId
      );
    } catch (error) {
      logger.error(`AI orchestration unavailable; creating handoff ticket: ${error.message}`);
      return { ...AI_UNAVAILABLE_RESULT };
    }
  }
}

const chatController = new ChatController();
export default chatController;
