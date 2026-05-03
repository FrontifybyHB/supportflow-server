import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import logger from "../loggers/winston.logger.js";
import aiOrchestrationService from "../services/aiOrchestration.service.js";
import ticketService from "../services/ticket.service.js";

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
    const aiResult = await this.aiService.classifyAndHandle(
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
}

const chatController = new ChatController();
export default chatController;
