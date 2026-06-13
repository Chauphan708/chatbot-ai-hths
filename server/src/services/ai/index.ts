export { geminiService, generateChatResponse, generateStructuredChat, generateText, generateFromImage, generateEmbedding, generateEmbeddings } from "./gemini.js";
export { promptService, buildSystemPrompt, defaultTemplates, getDefaultPersona } from "./promptTemplates.js";
export type { ChatMessage, GenerateOptions, EmbeddingResult, PedagogicalResponse } from "./gemini.js";
export type { PromptConfig, PromptTemplate } from "./promptTemplates.js";
