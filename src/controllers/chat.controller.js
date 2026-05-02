import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import logger from "../loggers/winston.logger.js";
import aiOrchestrationService from "../services/aiOrchestration.service.js";
import ticketService from "../services/ticket.service.js";

const AI_CONFIDENCE_THRESHOLD = 0.75;
const HUMAN_HANDOFF_PRIORITIES = new Set(["high", "urgent"]);
const URGENT_PATTERNS = [
  /\burgent\b/i,
  /\bemergency\b/i,
  /\basap\b/i,
  /\bimmediately\b/i,
  /\bcritical\b/i,
  /\blegal\b/i,
  /\blawsuit\b/i,
];
const HIGH_PRIORITY_PATTERNS = [
  /\bhuman\b/i,
  /\bagent\b/i,
  /\brepresentative\b/i,
  /\btalk to (someone|support|agent|human)\b/i,
  /\bspeak to (someone|support|agent|human)\b/i,
  /\brefund\b/i,
  /\bcharge(?:d)?\b/i,
  /\bcharged twice\b/i,
  /\bmoney deducted\b/i,
  /\bpayment (failed|issue|problem)\b/i,
  /\bbilling\b/i,
  /\binvoice\b/i,
  /\bcancel(?: my)? subscription\b/i,
  /\baccount (locked|blocked|hacked|disabled|suspended)\b/i,
  /\bunauthori[sz]ed\b/i,
  /\bcomplain(?:t)?\b/i,
  /\bangry\b/i,
  /\bnot delivered\b/i,
  /\border (missing|lost|damaged)\b/i,
];
const MEDIUM_PRIORITY_PATTERNS = [
  /\berror\b/i,
  /\bbug\b/i,
  /\bnot working\b/i,
  /\bissue\b/i,
  /\bproblem\b/i,
  /\bshipping\b/i,
  /\bdelivery\b/i,
  /\border\b/i,
  /\btracking\b/i,
];

const detectSupportPriority = ({ message = "", subject = "" }) => {
  const text = `${subject} ${message}`.trim();

  if (URGENT_PATTERNS.some((pattern) => pattern.test(text))) return "urgent";
  if (HIGH_PRIORITY_PATTERNS.some((pattern) => pattern.test(text))) return "high";
  if (MEDIUM_PRIORITY_PATTERNS.some((pattern) => pattern.test(text))) return "medium";

  return "low";
};

class ChatController {
  constructor(service = ticketService, aiService = aiOrchestrationService) {
    this.ticketService = service;
    this.aiService = aiService;
  }

  createMessage = asyncHandler(async (req, res) => {
    const { businessId, message, conversationId } = req.body;
    const priority = detectSupportPriority(req.body);
    const ticketPayload = { ...req.body, priority };

    if (HUMAN_HANDOFF_PRIORITIES.has(priority)) {
      const data = await this.ticketService.createCustomerTicket(
        ticketPayload,
        req.app.get("io")
      );

      logger.info(`Chat routed to agent handoff by backend priority: ${priority}`);

      return res.status(201).json(
        ApiResponse.success(
          {
            reply: "An agent will assist you shortly",
            handoff: true,
            ...data,
          },
          "Ticket created",
          201
        )
      );
    }

    try {
      const aiResult = await this.aiService.generateAIResponse(
        message,
        businessId,
        conversationId
      );

      if (
        aiResult.reply &&
        aiResult.confidence >= AI_CONFIDENCE_THRESHOLD
      ) {
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
              confidence: aiResult.confidence,
              tokensUsed: aiResult.tokensUsed,
              costEstimate: aiResult.costEstimate,
              ...data,
            },
            "AI reply generated"
          )
        );
      }
    } catch (error) {
      logger.error("AI chat response failed; falling back to ticket handoff", {
        error: error.message,
        businessId,
      });
    }

    const data = await this.ticketService.createCustomerTicket(
      ticketPayload,
      req.app.get("io")
    );

    res.status(201).json(
      ApiResponse.success(
        {
          reply: "An agent will assist you shortly",
          handoff: true,
          ...data,
        },
        "Ticket created",
        201
      )
    );
  });
}

const chatController = new ChatController();
export default chatController;
