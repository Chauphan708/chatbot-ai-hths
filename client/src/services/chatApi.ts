/**
 * Chat API Service
 */

import { api } from "./api";
import type {
  SendMessagePayload,
  SendMessageResponse,
  ChatSession,
  ChatMessage,
  FeedbackPayload,
  ApiResponse,
} from "../types";

const BASE = "/api/chat";

export const chatApi = {
  /** Get bot info by share code */
  getBotInfo: (shareCode: string) =>
    api.get<
      ApiResponse<{
        name: string;
        subject: string;
        gradeLevel: number;
        teacherName: string;
      }>
    >(`${BASE}/${shareCode}/info`),

  /** Send a message */
  sendMessage: (shareCode: string, data: SendMessagePayload) =>
    api.post<ApiResponse<SendMessageResponse>>(
      `${BASE}/${shareCode}`,
      data
    ),

  /** Get chat history for student */
  getHistory: (shareCode: string) =>
    api.get<ApiResponse<ChatSession[]>>(
      `${BASE}/${shareCode}/history`
    ),

  /** Get messages for a specific session */
  getSessionMessages: (shareCode: string, sessionId: string) =>
    api.get<ApiResponse<ChatMessage[]>>(
      `${BASE}/${shareCode}/session/${sessionId}`
    ),

  /** Send an image for OCR */
  sendImage: (
    shareCode: string,
    data: { image: string; mimeType: string; message?: string; sessionId?: string }
  ) =>
    api.post<ApiResponse<SendMessageResponse>>(
      `${BASE}/${shareCode}/image`,
      data
    ),

  /** Submit feedback */
  submitFeedback: (shareCode: string, data: FeedbackPayload) =>
    api.post<ApiResponse>(`${BASE}/${shareCode}/feedback`, data),

  // ─── Gamification (Phase 4) ──────────────────────
  getLeaderboard: (shareCode: string) =>
    api.get<ApiResponse<Array<{ studentId: string; name: string; totalXp: number; level: number; streakDays: number }>>>(
      `/api/gamification/${shareCode}/leaderboard`
    ),

  getQuests: (shareCode: string) =>
    api.get<ApiResponse<Array<{ id: string; title: string; description: string | null; questType: string; targetValue: number; xpReward: number; date: string; progress: { currentValue: number; isCompleted: boolean; completedAt: string | null } }>>>(
      `/api/gamification/${shareCode}/quests`
    ),

  getProgress: (shareCode: string) =>
    api.get<ApiResponse<{ totalXp: number; level: number; streakDays: number; badges: string[]; lastActiveAt: string | null }>>(
      `/api/gamification/${shareCode}/progress`
    ),

  getBadges: (shareCode: string) =>
    api.get<ApiResponse<Array<{ id: string; name: string; description: string; icon: string; earned: boolean }>>>(
      `/api/gamification/${shareCode}/badges`
    ),
};
