import { api } from "./api";
import type { ApiResponse } from "../types";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
}

export const driveApi = {
  // Check connection status
  getStatus: () => api.get<ApiResponse<{ isConnected: boolean }>>("/api/google-drive/status"),
  
  // List files/folders inside a folder
  listFiles: (folderId?: string) => 
    api.get<ApiResponse<DriveFile[]>>(`/api/google-drive/files${folderId ? `?folderId=${folderId}` : ""}`),
    
  // Get authentication URL
  getAuthUrl: () => api.get<ApiResponse<{ url: string }>>("/api/google-drive/auth-url"),
  
  // Import file content to a chatbot
  importFile: (data: { fileId: string; mimeType: string; chatbotId: string }) =>
    api.post<ApiResponse<{ id: string; title: string }>>("/api/google-drive/import", data),
};
