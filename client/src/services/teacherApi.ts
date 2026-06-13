/**
 * Teacher API Service
 */

import { api } from "./api";
import type {
  Chatbot,
  CreateChatbotPayload,
  UpdateChatbotPayload,
  TrainingDataItem,
  CreateTrainingDataPayload,
  AnalyticsData,
  ChatSession,
  ApiResponse,
} from "../types";

const BASE = "/api/teacher";
const TRAINING_BASE = "/api/training";

export const teacherApi = {
  // ─── Chatbots ────────────────────────────────────
  listBots: () => api.get<ApiResponse<Chatbot[]>>(`${BASE}/bots`),

  getBot: (id: string) => api.get<ApiResponse<Chatbot>>(`${BASE}/bots/${id}`),

  createBot: (data: CreateChatbotPayload) =>
    api.post<ApiResponse<Chatbot>>(`${BASE}/bots`, data),

  updateBot: (id: string, data: UpdateChatbotPayload) =>
    api.put<ApiResponse<Chatbot>>(`${BASE}/bots/${id}`, data),

  deleteBot: (id: string) =>
    api.delete<ApiResponse>(`${BASE}/bots/${id}`),

  // ─── Config ──────────────────────────────────────
  updateConfig: (id: string, data: UpdateChatbotPayload) =>
    api.put<ApiResponse<Chatbot>>(`${BASE}/bots/${id}/config`, data),

  // ─── Share & Clone ───────────────────────────────
  getShareInfo: (id: string) =>
    api.get<ApiResponse<{ shareCode: string; shareUrl: string }>>(
      `${BASE}/bots/${id}/share`
    ),

  cloneBot: (id: string) =>
    api.post<ApiResponse<Chatbot>>(`${BASE}/bots/${id}/clone`),

  // ─── Analytics ───────────────────────────────────
  getAnalytics: (id: string) =>
    api.get<ApiResponse<AnalyticsData>>(`${BASE}/bots/${id}/analytics`),

  getClassStats: (botId: string) =>
    api.get<ApiResponse<{ uniqueStudents: number; totalMessages: number; totalSessions: number; averageXp: number }>>(
      `${BASE}/bots/${botId}/analytics/overview`
    ),

  getAtRiskStudents: (botId: string) =>
    api.get<ApiResponse<Array<{ studentId: string; studentName: string; studentEmail: string; topic: string; errorCount: number; lastOccurred: string }>>>(
      `${BASE}/bots/${botId}/analytics/at-risk`
    ),

  getErrorTrends: (botId: string, days?: number) =>
    api.get<ApiResponse<Array<{ topic: string; errorType: string | null; totalErrors: number; studentCount: number }>>>(
      `${BASE}/bots/${botId}/analytics/error-trends${days ? `?days=${days}` : ""}`
    ),

  getChatHistory: (id: string) =>
    api.get<ApiResponse<ChatSession[]>>(`${BASE}/bots/${id}/chats`),

  // ─── Training Data ───────────────────────────────
  listTrainingData: (botId: string) =>
    api.get<ApiResponse<TrainingDataItem[]>>(
      `${TRAINING_BASE}/${botId}/data`
    ),

  addTrainingData: (botId: string, data: CreateTrainingDataPayload) =>
    api.post<ApiResponse<TrainingDataItem>>(
      `${TRAINING_BASE}/${botId}/data`,
      data
    ),

  deleteTrainingData: (botId: string, dataId: string) =>
    api.delete<ApiResponse>(
      `${TRAINING_BASE}/${botId}/data/${dataId}`
    ),

  embedAll: (botId: string) =>
    api.post<ApiResponse>(`${TRAINING_BASE}/${botId}/embed-all`),

  // ─── API Key ──────────────────────────────────────
  getApiKeyStatus: () =>
    api.get<ApiResponse<{ hasKey: boolean }>>(`${BASE}/api-key`),

  updateApiKey: (apiKey: string) =>
    api.put<ApiResponse>(`${BASE}/api-key`, { apiKey }),

  deleteApiKey: () =>
    api.delete<ApiResponse>(`${BASE}/api-key`),
};
