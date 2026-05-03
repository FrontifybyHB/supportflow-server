import fs from "fs";
import logger from "../loggers/winston.logger.js";

const DEFAULT_BAD_WORDS = ["fuck", "shit", "bitch", "asshole"];
const HALLUCINATION_PATTERNS = [
  /i\s+have\s+updated\s+your\s+account/i,
  /i['’]ve\s+updated\s+your\s+account/i,
  /i\s+have\s+refunded/i,
  /i['’]ve\s+refunded/i,
  /i\s+have\s+cancelled/i,
  /i\s+have\s+canceled/i,
  /i['’]ve\s+cancelled/i,
  /i['’]ve\s+canceled/i,
];

class AISafetyService {
  constructor() {
    this.badWords = this.loadBadWords();
  }

  filterBadWords(reply = "") {
    const flaggedWords = this.badWords.filter((word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(reply);
    });

    if (!flaggedWords.length) {
      return { sanitized: reply, flagged: false, flaggedWords: [] };
    }

    let sanitized = reply;
    for (const word of flaggedWords) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      sanitized = sanitized.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "***");
    }

    return { sanitized, flagged: true, flaggedWords };
  }

  detectHallucination(reply = "") {
    const pattern = HALLUCINATION_PATTERNS.find((item) => item.test(reply));

    return {
      isHallucination: Boolean(pattern),
      reason: pattern
        ? "Reply appears to promise an account, refund, or cancellation action."
        : "",
    };
  }

  truncateReply(reply = "", limit = 1000) {
    if (reply.length <= limit) return reply;
    return `${reply.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
  }

  loadBadWords() {
    const filePath = process.env.AI_SAFETY_BAD_WORDS_FILE;
    if (!filePath) return DEFAULT_BAD_WORDS;

    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const words = fileContent
        .split(/\r?\n/)
        .map((word) => word.trim().toLowerCase())
        .filter(Boolean);

      return words.length ? words : DEFAULT_BAD_WORDS;
    } catch (error) {
      logger.warn(`AI bad words file unavailable; using defaults: ${error.message}`);
      return DEFAULT_BAD_WORDS;
    }
  }
}

const aiSafetyService = new AISafetyService();
export default aiSafetyService;
