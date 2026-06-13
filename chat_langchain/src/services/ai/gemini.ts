/**
 * Gemini AI Service using LangChain
 */

import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

// ─── Models ──────────────────────────────────────

const CHAT_MODEL = "gemini-2.5-flash";
const EMBEDDING_MODEL = "text-embedding-004"; // Standard Google embedding model in LangChain
const EMBEDDING_DIMENSIONS = 768;

// ─── Per-Teacher API Key Support ─────────────────

/** Cache model instances per API key to avoid re-creating */
const modelCache = new Map<string, ChatGoogleGenerativeAI>();

function getChatModel(apiKey?: string | null, temperature = 0.7, maxTokens = 2048): ChatGoogleGenerativeAI {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Không có API key Gemini. Giáo viên cần cung cấp API key trong cài đặt.");
  }

  const cacheKey = `${key}_${temperature}_${maxTokens}`;
  let model = modelCache.get(cacheKey);
  if (!model) {
    model = new ChatGoogleGenerativeAI({
      apiKey: key,
      model: CHAT_MODEL,
      temperature,
      maxOutputTokens: maxTokens,
    });
    modelCache.set(cacheKey, model);
  }
  return model;
}

// ─── Types ───────────────────────────────────────

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface GenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string | null;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

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

// ─── JSON Schema for Structured Output ────────────

const pedagogicalResponseSchema = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "Nội dung phản hồi chính cho học sinh (Markdown). KHÔNG chứa tag hay metadata.",
    },
    hatMode: {
      type: "string",
      nullable: true,
      description: "Mũ tư duy đang sử dụng: 'Trắng', 'Đỏ', 'Đen', 'Vàng', 'Xanh lá', 'Xanh dương'. null nếu không dùng.",
    },
    scaffoldingLevel: {
      type: "integer",
      nullable: true,
      description: "Mức giàn giáo gợi ý (1-5). null nếu không thay đổi mức hiện tại.",
    },
    insight: {
      type: "object",
      nullable: true,
      description: "Phát hiện lỗi sai của HS. null nếu HS không sai hoặc chỉ hỏi bài.",
      properties: {
        topic: {
          type: "string",
          description: "Chủ đề kiến thức (VD: 'Phép cộng phân số', 'Chính tả')",
        },
        errorType: {
          type: "string",
          description: "Mô tả lỗi sai cụ thể (VD: 'Chưa quy đồng mẫu số')",
        },
      },
      required: ["topic", "errorType"],
    },
    encouragement: {
      type: "string",
      nullable: true,
      description: "Lời khen/khuyến khích ngắn nếu HS làm đúng hoặc cố gắng. null nếu không cần.",
    },
  },
  required: ["reply"],
};

// Helper: Convert App Messages to LangChain Messages
function convertToLangChainMessages(messages: ChatMessage[], systemPrompt?: string): BaseMessage[] {
  const lcMessages: BaseMessage[] = [];
  if (systemPrompt) {
    lcMessages.push(new SystemMessage(systemPrompt));
  }
  for (const msg of messages) {
    if (msg.role === "user") {
      lcMessages.push(new HumanMessage(msg.content));
    } else {
      lcMessages.push(new AIMessage(msg.content));
    }
  }
  return lcMessages;
}

// ─── Structured Chat Generation (Phase 1) ────────

export async function generateStructuredChat(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<PedagogicalResponse> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048, apiKey } = options;
  const model = getChatModel(apiKey, temperature, maxTokens);

  // Bind structured output using LangChain
  const structuredModel = model.withStructuredOutput(pedagogicalResponseSchema);
  
  const lcMessages = convertToLangChainMessages(messages, systemPrompt);
  const response = (await structuredModel.invoke(lcMessages)) as any;

  return {
    reply: response.reply || "Xin lỗi em, có lỗi xảy ra. Em hãy thử lại nhé! 🌟",
    hatMode: response.hatMode || null,
    scaffoldingLevel: response.scaffoldingLevel ?? null,
    insight: response.insight || null,
    encouragement: response.encouragement || null,
  };
}

// ─── Plain Chat Generation (Legacy) ──────────────

export async function generateChatResponse(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048, apiKey } = options;
  const model = getChatModel(apiKey, temperature, maxTokens);

  const lcMessages = convertToLangChainMessages(messages, systemPrompt);
  const response = await model.invoke(lcMessages);
  
  return typeof response.content === "string" ? response.content : JSON.stringify(response.content);
}

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

export async function generateFromImage(
  imageBase64: string,
  mimeType: string,
  textPrompt: string,
  options: GenerateOptions = {}
): Promise<PedagogicalResponse> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048, apiKey } = options;
  const model = getChatModel(apiKey, temperature, maxTokens);

  const structuredModel = model.withStructuredOutput(pedagogicalResponseSchema);

  const lcMessages: BaseMessage[] = [];
  if (systemPrompt) {
    lcMessages.push(new SystemMessage(systemPrompt));
  }

  // LangChain supports multimodal input by passing content as parts array
  lcMessages.push(
    new HumanMessage({
      content: [
        {
          type: "text",
          text: textPrompt || "Hãy phân tích bài tập trong ảnh và hướng dẫn em giải."
        },
        {
          type: "image_url",
          image_url: `data:${mimeType};base64,${imageBase64}`
        }
      ]
    })
  );

  const response = (await structuredModel.invoke(lcMessages)) as any;

  return {
    reply: response.reply || "Xin lỗi em, không đọc được ảnh. Em hãy chụp lại rõ hơn nhé! 📸",
    hatMode: response.hatMode || null,
    scaffoldingLevel: response.scaffoldingLevel ?? null,
    insight: response.insight || null,
    encouragement: response.encouragement || null,
  };
}

// ─── Embeddings ──────────────────────────────────

let embeddingsInstance: GoogleGenerativeAIEmbeddings | null = null;

function getEmbeddings(): GoogleGenerativeAIEmbeddings {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Không có GEMINI_API_KEY cho dịch vụ nhúng (Embeddings).");
  }

  if (!embeddingsInstance) {
    embeddingsInstance = new GoogleGenerativeAIEmbeddings({
      apiKey: key,
      model: EMBEDDING_MODEL,
    });
  }
  return embeddingsInstance;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const embeddings = getEmbeddings();
  const res = await embeddings.embedQuery(text);

  return {
    embedding: res,
    dimensions: EMBEDDING_DIMENSIONS,
  };
}

export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  const embeddings = getEmbeddings();
  const res = await embeddings.embedDocuments(texts);

  return res.map((vector: number[]) => ({
    embedding: vector,
    dimensions: EMBEDDING_DIMENSIONS,
  }));
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
