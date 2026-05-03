import appError from "../utils/appError.js";
import logger from "../loggers/winston.logger.js";
import AIModelRepository from "../repositories/aiModel.repository.js";
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  PRIORITY_DEFINITIONS,
  REPLY_SYSTEM_PROMPT,
} from "../constants/aiPrompts.js";

const MODEL_CACHE_TTL_MS = 60 * 1000;
const CLASSIFICATION_TIMEOUT_MS = Number(process.env.AI_CLASSIFICATION_TIMEOUT_MS) || 3000;
const REPLY_TIMEOUT_MS = Number(process.env.AI_REPLY_TIMEOUT_MS) || 5000;

const DEFAULT_CLASSIFICATION = {
  priority: "Medium",
  category: "other",
  shouldHandoff: true,
  reason: "Classification failed",
  confidence: 0,
};
const PRIORITIES = new Set(["Low", "Medium", "High", "Critical"]);
const CATEGORIES = new Set([
  "billing",
  "account",
  "technical",
  "general",
  "refund",
  "security",
  "other",
]);

class AIClassificationService {
  constructor(aiModelRepository = new AIModelRepository()) {
    this.aiModelRepository = aiModelRepository;
    this.modelCache = new Map();
  }

  async classify(message, history = [], businessId) {
    const startedAt = Date.now();

    try {
      const modelContext = await this.getBusinessModelContext(businessId);
      const prompt = this.buildClassificationPrompt(message, history);
      const aiResult = await this.callWithRetry(
        modelContext,
        prompt,
        CLASSIFICATION_TIMEOUT_MS,
        "classification"
      );
      const parsed = this.parseClassification(aiResult.text);
      const classification = this.enforceBusinessRules(parsed, message);
      const latencyMs = Date.now() - startedAt;

      logger.info(
        `AI classification: businessId=${businessId}, priority=${classification.priority}, category=${classification.category}, confidence=${classification.confidence}, latencyMs=${latencyMs}, tokens=${aiResult.tokensUsed}`
      );

      return {
        ...classification,
        latencyMs,
        tokensUsed: aiResult.tokensUsed,
        provider: aiResult.model.provider,
        model: aiResult.model.name,
        modelSource: aiResult.source,
      };
    } catch (error) {
      logger.error(`AI classification failed: ${error.message}`);
      return {
        ...DEFAULT_CLASSIFICATION,
        latencyMs: Date.now() - startedAt,
        tokensUsed: this.estimateTokens(message, DEFAULT_CLASSIFICATION.reason),
      };
    }
  }

  async generateReply(message, history = [], knowledgeEntries = [], businessId, businessName = "the business") {
    const modelContext = await this.getBusinessModelContext(businessId);
    const prompt = this.buildReplyPrompt(
      message,
      history,
      knowledgeEntries,
      businessName
    );
    const aiResult = await this.callWithRetry(
      modelContext,
      prompt,
      REPLY_TIMEOUT_MS,
      "reply"
    );

    return {
      reply: aiResult.text.trim(),
      tokensUsed: aiResult.tokensUsed,
      provider: aiResult.model.provider,
      model: aiResult.model.name,
      modelSource: aiResult.source,
    };
  }

  async getBusinessModelContext(businessId) {
    const cacheKey = String(businessId);
    const cached = this.modelCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const modelContext = await this.aiModelRepository.getBusinessActiveModel(businessId);
    this.modelCache.set(cacheKey, {
      value: modelContext,
      expiresAt: Date.now() + MODEL_CACHE_TTL_MS,
    });

    return modelContext;
  }

  async callWithRetry(modelContext, prompt, timeoutMs, purpose) {
    let lastError;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await this.callWithFallback(modelContext, prompt, timeoutMs);
      } catch (error) {
        lastError = error;
        logger.warn(`AI ${purpose} attempt ${attempt} failed: ${error.message}`);
      }
    }

    throw lastError;
  }

  async callWithFallback(modelContext, prompt, timeoutMs) {
    try {
      return await this.callProvider(modelContext.model, prompt, timeoutMs, modelContext.source);
    } catch (error) {
      if (modelContext.source !== "business") throw error;

      logger.warn(
        `Business AI model failed; falling back to platform default: ${error.message}`
      );
      const fallback = await this.aiModelRepository.getActiveDefault();
      if (!fallback) throw error;

      return this.callProvider(fallback, prompt, timeoutMs, "platform_default");
    }
  }

  async callProvider(model, prompt, timeoutMs, source) {
    if (model.provider === "openai") {
      return this.callOpenAI(model, prompt, timeoutMs, source);
    }

    if (model.provider === "gemini") {
      return this.callGemini(model, prompt, timeoutMs, source);
    }

    return this.callCustomProvider(model, prompt, timeoutMs, source);
  }

  async callOpenAI(model, prompt, timeoutMs, source) {
    const endpoint = model.endpoint || "https://api.openai.com/v1/chat/completions";
    const response = await this.fetchWithTimeout(endpoint, timeoutMs, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${model.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.name,
        messages: [{ role: "user", content: prompt }],
        max_tokens: model.config?.maxTokens || 700,
        temperature: model.config?.temperature || 0.2,
      }),
    });

    if (!response.ok) {
      throw appError(await this.buildProviderErrorMessage("OpenAI", response), 502);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || "",
      tokensUsed: data.usage?.total_tokens || this.estimateTokens(prompt, ""),
      model,
      source,
    };
  }

  async callGemini(model, prompt, timeoutMs, source) {
    const modelName = model.name.replace(/^models\//, "");
    const endpoint =
      this.buildGeminiEndpoint(model.endpoint, model.apiKey) ||
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${model.apiKey}`;
    const response = await this.fetchWithTimeout(endpoint, timeoutMs, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: model.config?.maxTokens || 700,
          temperature: model.config?.temperature || 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw appError(await this.buildProviderErrorMessage("Gemini", response), 502);
    }

    const data = await response.json();
    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
      tokensUsed: data.usageMetadata?.totalTokenCount || this.estimateTokens(prompt, ""),
      model,
      source,
    };
  }

  async callCustomProvider(model, prompt, timeoutMs, source) {
    if (!model.endpoint) throw appError("Custom model endpoint is required", 400);

    const response = await this.fetchWithTimeout(model.endpoint, timeoutMs, {
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
      throw appError(
        await this.buildProviderErrorMessage("Custom AI provider", response),
        502
      );
    }

    const data = await response.json();
    return {
      text: data.message || data.text || data.response || "",
      tokensUsed: data.tokensUsed || data.usage?.total_tokens || this.estimateTokens(prompt, ""),
      model,
      source,
    };
  }

  fetchWithTimeout(url, timeoutMs, options) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { ...options, signal: controller.signal }).finally(() => {
      clearTimeout(timeout);
    });
  }

  buildClassificationPrompt(message, history) {
    return CLASSIFICATION_SYSTEM_PROMPT
      .replace("{history}", this.formatHistory(history))
      .replace("{message}", this.escapePromptValue(message))
      .replace("{priorityDefinitions}", PRIORITY_DEFINITIONS);
  }

  buildReplyPrompt(message, history, knowledgeEntries, businessName) {
    return REPLY_SYSTEM_PROMPT
      .replace("{businessName}", this.escapePromptValue(businessName))
      .replace("{knowledgeEntries}", this.formatKnowledge(knowledgeEntries))
      .replace("{history}", this.formatHistory(history))
      .replace("{message}", this.escapePromptValue(message));
  }

  parseClassification(text) {
    const jsonText = this.extractJson(text);
    const parsed = JSON.parse(jsonText);
    const priority = this.normalizePriority(parsed.priority);
    const category = this.normalizeCategory(parsed.category);
    const confidence = this.normalizeConfidence(parsed.confidence);

    return {
      priority,
      category,
      shouldHandoff: Boolean(parsed.shouldHandoff),
      reason: String(parsed.reason || "Classified by AI").slice(0, 300),
      confidence,
    };
  }

  enforceBusinessRules(classification, message) {
    const result = { ...classification };

    result.shouldHandoff =
      ["High", "Critical"].includes(result.priority) ||
      result.confidence < 0.7 ||
      ["security", "refund"].includes(result.category) ||
      this.explicitlyAsksForHuman(message);

    return result;
  }

  extractJson(text = "") {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw appError("AI classification did not return JSON", 502);

    return match[0];
  }

  normalizePriority(priority) {
    const normalized = String(priority || "").trim().toLowerCase();
    const priorityMap = {
      low: "Low",
      medium: "Medium",
      high: "High",
      critical: "Critical",
      urgent: "Critical",
    };

    const value = priorityMap[normalized] || "Medium";
    return PRIORITIES.has(value) ? value : "Medium";
  }

  normalizeCategory(category) {
    const value = String(category || "other").trim().toLowerCase();
    return CATEGORIES.has(value) ? value : "other";
  }

  normalizeConfidence(confidence) {
    const numeric = Number(confidence);
    if (Number.isNaN(numeric)) return 0;
    return Math.min(Math.max(numeric, 0), 1);
  }

  explicitlyAsksForHuman(message = "") {
    return /\b(human|agent|representative|person|support team)\b/i.test(message);
  }

  formatHistory(history = []) {
    if (!history.length) return "No previous conversation.";

    return history
      .slice(-10)
      .map((item) => `${item.role || item.senderType || "unknown"}: ${item.content}`)
      .join("\n");
  }

  formatKnowledge(knowledgeEntries = []) {
    if (!knowledgeEntries.length) {
      return "No matching knowledge base entries were found.";
    }

    return knowledgeEntries
      .map((entry, index) => {
        const title = entry.title || `Entry ${index + 1}`;
        const content = entry.content || entry.answer || entry.body || "";
        return `${index + 1}. ${title}\n${content}`;
      })
      .join("\n\n");
  }

  escapePromptValue(value = "") {
    return String(value).replace(/"/g, '\\"');
  }

  buildGeminiEndpoint(endpoint, apiKey) {
    if (!endpoint) return "";
    if (endpoint.includes("key=")) return endpoint;
    return `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${apiKey}`;
  }

  estimateTokens(prompt, output) {
    return Math.max(1, Math.ceil(`${prompt} ${output}`.trim().length / 4));
  }

  async buildProviderErrorMessage(provider, response) {
    let detail = "";

    try {
      detail = await response.text();
    } catch {
      detail = "";
    }

    const cleanDetail = detail.replace(/\s+/g, " ").slice(0, 300);
    return cleanDetail
      ? `${provider} request failed (${response.status}): ${cleanDetail}`
      : `${provider} request failed (${response.status})`;
  }
}

const aiClassificationService = new AIClassificationService();
export { DEFAULT_CLASSIFICATION };
export default aiClassificationService;
