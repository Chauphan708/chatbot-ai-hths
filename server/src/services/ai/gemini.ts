/**
 * Gemini AI Service — Core wrapper for Google Gemini API
 *
 * Provides:
 * - Text generation (chat completion)
 * - Text embedding (for RAG vectorization)
 * - Streaming support (for Sprint 3)
 */

import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { env } from "../../config/env.js";

// Initialize Gemini client
const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// ─── Models ──────────────────────────────────────

const CHAT_MODEL = "gemini-2.5-flash";
const EMBEDDING_MODEL = "gemini-embedding-exp-03-07";
const EMBEDDING_DIMENSIONS = 768;

// ─── Types ───────────────────────────────────────

export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface GenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
}

// ─── Chat Generation ─────────────────────────────

/**
 * Generate a chat response from Gemini
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<string> {
  const { systemPrompt, temperature = 0.7, maxTokens = 2048 } = options;

  // Build contents array for Gemini
  const contents = messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const response = await genai.models.generateContent({
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

// ─── Embeddings ──────────────────────────────────

/**
 * Generate embedding vector for a single text
 */
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult> {
  const response = await genai.models.embedContent({
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
  generateText,
  generateEmbedding,
  generateEmbeddings,
  CHAT_MODEL,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
};
