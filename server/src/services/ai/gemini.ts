/**
 * Gemini AI Service — Core wrapper for Google Gemini API
 *
 * Provides:
 * - Text generation (chat completion)
 * - Structured output generation (JSON Schema — Phase 1)
 * - Text embedding (for RAG vectorization)
 * - Image analysis (Gemini Vision — Phase 3)
 * - Per-teacher API key support (GV tự cung cấp API key)
 */

import { GoogleGenAI, type GenerateContentResponse, Type } from "@google/genai";
import { env } from "../../config/env.js";

// ─── Models ──────────────────────────────────────

const CHAT_MODEL = "gemini-2.5-flash";
const EMBEDDING_MODEL = "gemini-embedding-exp-03-07";
const EMBEDDING_DIMENSIONS = 768;

// ─── Per-Teacher API Key Support ─────────────────

/** Cache GenAI clients per API key to avoid re-creating */
const clientCache = new Map<string, GoogleGenAI>();

function getGenAIClient(apiKey?: string | null): GoogleGenAI {
  const key = apiKey || env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Không có API key Gemini. Giáo viên cần cung cấp API key trong cài đặt.");
  }

  let client = clientCache.get(key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: key });
    clientCache.set(key, client);
  }
  return client;
}

// System-level client for embeddings (always uses system key)
const systemClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// ─── Types ───────────────────────────────────────

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface GenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string | null; // Per-teacher API key
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

/**
 * Structured response from AI — phản hồi sư phạm có cấu trúc.
 * Thay thế hoàn toàn cơ chế Regex parsing.
 */
export interface PedagogicalResponse {
  reply: string;
  hatMode: string | null;
  scaffoldingLevel: number | null;
  insight: {
    topic: string;
    errorType: string;
  } | null;
  encouragement: string | null;
}

// ─── JSON Schema cho Structured Output ──────────

const pedagogicalResponseSchema = {
  type: Type.OBJECT,
  properties: {
    reply: {
      type: Type.STRING,
      description: "Nội dung phản hồi chính cho học sinh (Markdown). KHÔNG chứa tag hay metadata.",
    },
    hatMode: {
      type: Type.STRING,
      nullable: true,
      description: "Mũ tư duy đang sử dụng: 'Trắng', 'Đỏ', 'Đen', 'Vàng', 'Xanh lá', 'Xanh dương'. null nếu không dùng.",
    },
    scaffoldingLevel: {
      type: Type.INTEGER,
      nullable: true,
      description: "Mức giàn giáo gợi ý (1-5). null nếu không thay đổi mức hiện tại.",
    },
    insight: {
      type: Type.OBJECT,
      nullable: true,
      description: "Phát hiện lỗi sai của HS. null nếu HS không sai hoặc chỉ hỏi bài.",
      properties: {
        topic: {
          type: Type.STRING,
          description: "Chủ đề kiến thức (VD: 'Phép cộng phân số', 'Chính tả')",
        },
        errorType: {
          type: Type.STRING,
          description: "Mô tả lỗi sai cụ thể (VD: 'Chưa quy đồng mẫu số')",
        },
      },
      required: ["topic", "errorType"],
    },
    encouragement: {
      type: Type.STRING,
      nullable: true,
      description: "Lời khen/khuyến khích ngắn nếu HS làm đúng hoặc cố gắng. null nếu không cần.",
    },
  },
  required: ["reply"],
};

// ─── Structured Chat Generation (Phase 1) ────────

/**
 * Generate a structured pedagogical response from Gemini.
 * Returns a typed JSON object — no regex parsing needed.
 */
export async function generateStructuredChat(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<PedagogicalResponse> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048, apiKey } = options;
  const client = getGenAIClient(apiKey);

  const contents = messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const response = await client.models.generateContent({
    model: CHAT_MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      responseSchema: pedagogicalResponseSchema,
    },
  });

  const text = extractText(response);
  const parsed = JSON.parse(text) as PedagogicalResponse;

  // Normalize nullable fields
  return {
    reply: parsed.reply || "Xin lỗi em, có lỗi xảy ra. Em hãy thử lại nhé! 🌟",
    hatMode: parsed.hatMode || null,
    scaffoldingLevel: parsed.scaffoldingLevel ?? null,
    insight: parsed.insight || null,
    encouragement: parsed.encouragement || null,
  };
}

// ─── Plain Chat Generation (Legacy) ──────────────

/**
 * Generate a plain text chat response from Gemini.
 * Kept for backward compatibility (non-pedagogical uses).
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048, apiKey } = options;
  const client = getGenAIClient(apiKey);

  const contents = messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const response = await client.models.generateContent({
    model: CHAT_MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  return extractText(response);
}

/**
 * Generate a single-turn response (no conversation history)
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  return generateChatResponse(
    [{ role: "user", content: prompt }],
    options
  );
}

// ─── Image Analysis (Phase 3 — Gemini Vision) ────

/**
 * Analyze an image (e.g. homework photo) and return structured pedagogical response.
 * Uses Gemini's native multimodal capability — no separate OCR needed.
 */
export async function generateFromImage(
  imageBase64: string,
  mimeType: string,
  textPrompt: string,
  options: GenerateOptions = {}
): Promise<PedagogicalResponse> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048, apiKey } = options;
  const client = getGenAIClient(apiKey);

  const response = await client.models.generateContent({
    model: CHAT_MODEL,
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: textPrompt || "Hãy phân tích bài tập trong ảnh và hướng dẫn em giải." },
      ],
    }],
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      responseSchema: pedagogicalResponseSchema,
    },
  });

  const text = extractText(response);
  const parsed = JSON.parse(text) as PedagogicalResponse;

  return {
    reply: parsed.reply || "Xin lỗi em, không đọc được ảnh. Em hãy chụp lại rõ hơn nhé! 📸",
    hatMode: parsed.hatMode || null,
    scaffoldingLevel: parsed.scaffoldingLevel ?? null,
    insight: parsed.insight || null,
    encouragement: parsed.encouragement || null,
  };
}

// ─── Embeddings ──────────────────────────────────

/**
 * Generate embedding vector for a single text.
 * Always uses system API key (embeddings are system-level).
 */
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult> {
  const response = await systemClient.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const embeddingValues = response.embeddings?.[0]?.values;
  if (!embeddingValues) {
    throw new Error("Failed to generate embedding — empty response");
  }

  return {
    embedding: embeddingValues,
    dimensions: EMBEDDING_DIMENSIONS,
  };
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  const results: EmbeddingResult[] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    results.push(...batchResults);
  }

  return results;
}

// ─── Helpers ─────────────────────────────────────

function extractText(response: GenerateContentResponse): string {
  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
}

// ─── Exports ─────────────────────────────────────

export const geminiService = {
  generateChatResponse,
  generateStructuredChat,
  generateText,
  generateFromImage,
  generateEmbedding,
  generateEmbeddings,
  CHAT_MODEL,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
};
