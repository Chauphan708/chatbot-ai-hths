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

  /** Submit feedback */
  submitFeedback: (shareCode: string, data: FeedbackPayload) =>
    api.post<ApiResponse>(`${BASE}/${shareCode}/feedback`, data),
};
