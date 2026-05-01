/**
 * Safety Service — Content Filter for Student Messages
 *
 * Checks student input for inappropriate content before sending to Gemini.
 * Blocks profanity, sensitive topics, and personal information requests.
 */

// ─── Simple Blocklist (Demo) ─────────────────────
// Trong thực tế, có thể tích hợp AI moderation API (Google Perspective API)
// hoặc dùng thư viện bad-words mạnh hơn. Ở đây dùng regex cơ bản cho Tiếng Việt.

const BAD_WORDS = [
  "đm", "địt", "lồn", "cặc", "chó đẻ", "ngu", "đần", "fuck", "shit",
  "bitch", "cút", "chết đi", "giết", "đánh nhau", "tự tử",
];

const PERSONAL_INFO_PATTERNS = [
  // SĐT VN cơ bản
  /(0|84)(3|5|7|8|9)[0-9]{8}/g,
  // Căn cước / CMT
  /[0-9]{9,12}/g,
];

// ─── Interfaces ──────────────────────────────────

export interface SafetyCheckResult {
  isSafe: boolean;
  reason?: "profanity" | "personal_info" | "violence";
  blockedWord?: string;
}

// ─── Core Function ───────────────────────────────

/**
 * Checks a text message for safety violations.
 * Returns true if safe, false with reason if unsafe.
 */
export function checkMessageSafety(text: string): SafetyCheckResult {
  const normalizedText = text.toLowerCase();

  // 1. Check Profanity / Bad words
  for (const word of BAD_WORDS) {
    // Regex bounds to match exact words or words in punctuation
    const regex = new RegExp(`\\b${word}\\b|${word}`, "i");
    if (regex.test(normalizedText)) {
      return {
        isSafe: false,
        reason: "profanity",
        blockedWord: word,
      };
    }
  }

  // 2. Check Personal Info (SĐT, CMT)
  for (const pattern of PERSONAL_INFO_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return {
        isSafe: false,
        reason: "personal_info",
      };
    }
  }

  return { isSafe: true };
}

// ─── Export ──────────────────────────────────────

export const safetyService = {
  checkMessageSafety,
  BAD_WORDS,
};
