import api from "./api";
import type { ApiResponse } from "./authApi";

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
  getTeachers: () => api.get<ApiResponse<Teacher[]>>(`${BASE}/teachers`),
  
  verifyTeacher: (id: string, isVerified: boolean) => 
    api.patch<ApiResponse<Teacher>>(`${BASE}/teachers/${id}/verify`, { isVerified }),
    
  getConversations: () => api.get<ApiResponse<Conversation[]>>(`${BASE}/conversations`),
  
  getConversationDetail: (id: string) => 
    api.get<ApiResponse<any>>(`${BASE}/conversations/${id}`),
    
  getStats: () => api.get<ApiResponse<Stats>>(`${BASE}/stats`),
};
