/**
 * Parent API Service
 */

import { api } from "./api";
import type {
  ChildInfo,
  ChatSession,
  ChatMessage,
  ApiResponse,
} from "../types";

const BASE = "/api/parent";

export const parentApi = {
  /** List all children of the parent */
  listChildren: () =>
    api.get<ApiResponse<ChildInfo[]>>(`${BASE}/children`),

  /** Add a child account */
  addChild: (data: {
    email: string;
    password: string;
    displayName: string;
  }) => api.post<ApiResponse<ChildInfo>>(`${BASE}/children`, data),

  /** Get child chat history (sessions) */
  getChildHistory: (childId: string) =>
    api.get<ApiResponse<ChatSession[]>>(
      `${BASE}/children/${childId}/history`
    ),

  /** Get detailed messages for a session */
  getSessionMessages: (childId: string, sessionId: string) =>
    api.get<ApiResponse<ChatMessage[]>>(
      `${BASE}/children/${childId}/session/${sessionId}`
    ),
};
