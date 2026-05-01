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
};
