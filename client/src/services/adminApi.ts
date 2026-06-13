import { api } from "./api";
import type { ApiResponse } from "../types";

export interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  chatbotId: string;
  title: string;
  updatedAt: string;
  user?: {
    name: string;
    email: string;
  };
  chatbot?: {
    name: string;
    class?: {
      name: string;
    };
  };
}

export interface Stats {
  totalUsers: number;
  totalTeachers: number;
  totalClasses: number;
  totalConversations: number;
}

const BASE = "/api/admin";

export const adminApi = {
  getTeachers: (params?: { search?: string; verified?: boolean }) => {
    let url = `${BASE}/teachers`;
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.verified !== undefined) query.append("verified", String(params.verified));
    const queryString = query.toString();
    return api.get<ApiResponse<Teacher[]>>(queryString ? `${url}?${queryString}` : url);
  },
  
  verifyTeacher: (id: string, isVerified: boolean) => 
    api.patch<ApiResponse<Teacher>>(`${BASE}/teachers/${id}/verify`, { isVerified }),
    
  getConversations: (params?: { search?: string; classId?: string }) => {
    let url = `${BASE}/conversations`;
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.classId) query.append("classId", params.classId);
    const queryString = query.toString();
    return api.get<ApiResponse<Conversation[]>>(queryString ? `${url}?${queryString}` : url);
  },
  
  getConversationDetail: (id: string) => 
    api.get<ApiResponse<any>>(`${BASE}/conversations/${id}`),
    
  getStats: () => api.get<ApiResponse<Stats>>(`${BASE}/stats`),
};
