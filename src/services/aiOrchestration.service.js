import appError from "../utils/appError.js";
import logger from "../loggers/winston.logger.js";
import AIModelRepository from "../repositories/aiModel.repository.js";
import BusinessRepository from "../repositories/business.repository.js";

const DEMO_COST_PER_1K_TOKENS = 0.002;
const DEFAULT_CONFIDENCE = 0.85;

class AIOrchestrationService {
  constructor(
    aiModelRepository = new AIModelRepository(),
    businessRepository = new BusinessRepository()
  ) {
    this.aiModelRepository = aiModelRepository;
    this.businessRepository = businessRepository;
  }

  async generateAIResponse(message, businessId, conversationId = null) {
    if (!message?.trim()) throw appError("Message is required", 400);
    if (!businessId) throw appError("Business ID is required", 400);

    const model = await this.resolveModel();
    const aiResponse = await this.callProvider(model, message);
    const tokensUsed =
      aiResponse.tokensUsed || this.estimateTokens(message, aiResponse.reply);
    const costEstimate = (tokensUsed / 1000) * DEMO_COST_PER_1K_TOKENS;

    await this.updateBusinessUsage(businessId, tokensUsed, costEstimate);

    logger.info("AI response generated", {
      provider: model.provider,
      model: model.name,
      businessId,
      conversationId,
      tokensUsed,
      costEstimate,
    });

    return {
      reply: aiResponse.reply,
      confidence: aiResponse.reply ? DEFAULT_CONFIDENCE : 0,
      tokensUsed,
      costEstimate,
      provider: model.provider,
      model: model.name,
    };
  }

  async resolveModel() {
    const envProvider = process.env.AI_PROVIDER?.trim().toLowerCase();

    if (envProvider === "openai" && process.env.OPENAI_API_KEY) {
      return {
        provider: "openai",
        name: process.env.OPENAI_MODEL || "gpt-4o-mini",
        apiKey: process.env.OPENAI_API_KEY,
        endpoint: process.env.OPENAI_ENDPOINT || "",
        config: {
          maxTokens: Number(process.env.AI_MAX_TOKENS) || 500,
          temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
        },
      };
    }

    if (envProvider === "gemini" && process.env.GEMINI_API_KEY) {
      return {
        provider: "gemini",
        name: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY,
        endpoint: process.env.GEMINI_ENDPOINT || "",
        config: {
          maxTokens: Number(process.env.AI_MAX_TOKENS) || 500,
          temperature: Number(process.env.AI_TEMPERATURE) || 0.7,
        },
      };
    }

    const dbModel = await this.aiModelRepository.getActiveDefault();
    if (dbModel) return dbModel;

    throw appError("No active AI model configured", 500);
  }

  async callProvider(model, message) {
    if (model.provider === "openai") {
      return this.callOpenAI(model, message);
    }

    if (model.provider === "gemini") {
      return this.callGemini(model, message);
    }

    return this.callCustomProvider(model, message);
  }

  async callOpenAI(model, prompt) {
    const endpoint = model.endpoint || "https://api.openai.com/v1/chat/completions";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${model.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.name,
        messages: [{ role: "user", content: prompt }],
        max_tokens: model.config?.maxTokens || 500,
        temperature: model.config?.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      throw appError("OpenAI request failed", 502);
    }

    const data = await response.json();
    return {
      reply: data.choices?.[0]?.message?.content || "",
      tokensUsed: data.usage?.total_tokens,
    };
  }

  async callGemini(model, prompt) {
    const modelName = model.name.replace(/^models\//, "");
    const endpoint =
      model.endpoint ||
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${model.apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: model.config?.maxTokens || 500,
          temperature: model.config?.temperature || 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw appError("Gemini request failed", 502);
    }

    const data = await response.json();
    return {
      reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
      tokensUsed: data.usageMetadata?.totalTokenCount,
    };
  }

  async callCustomProvider(model, prompt) {
    if (!model.endpoint) throw appError("Custom model endpoint is required", 400);

    const response = await fetch(model.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${model.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt,
        config: model.config,
      }),
    });

    if (!response.ok) {
      throw appError("Custom AI provider request failed", 502);
    }

    const data = await response.json();
    return {
      reply: data.message || data.text || data.response || "",
      tokensUsed: data.tokensUsed || data.usage?.total_tokens,
    };
  }

  async updateBusinessUsage(businessId, tokensUsed, costEstimate) {
    await this.businessRepository.incrementUsage(businessId, {
      aiCalls: 1,
      tokensConsumed: tokensUsed,
      costEstimate,
    });
  }

  estimateTokens(message, response) {
    const combinedText = `${message || ""} ${response || ""}`.trim();
    return Math.max(1, Math.ceil(combinedText.length / 4));
  }
}

const aiOrchestrationService = new AIOrchestrationService();

export const generateAIResponse = (message, businessId, conversationId) =>
  aiOrchestrationService.generateAIResponse(message, businessId, conversationId);

export default aiOrchestrationService;
