/**
 * Auth API Service
 */

import { api } from "./api";
import type {
  User,
  LoginPayload,
  RegisterPayload,
  ApiResponse,
} from "../types";

const AUTH_BASE = "/api/auth";

export const authApi = {
  /** Register a new user */
  register: (payload: RegisterPayload) =>
    api.post<ApiResponse<{ user: User; token: string }>>(
      `${AUTH_BASE}/sign-up/email`,
      {
        email: payload.email,
        password: payload.password,
        name: payload.displayName,
        role: payload.role,
      }
    ),

  /** Login with email/password */
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<{ user: User; token: string }>>(
      `${AUTH_BASE}/sign-in/email`,
      payload
    ),

  /** Get current session */
  getSession: () =>
    api.get<ApiResponse<{ user: User }>>(`${AUTH_BASE}/get-session`),

  /** Logout */
  logout: () => api.post<ApiResponse>(`${AUTH_BASE}/sign-out`),
};
