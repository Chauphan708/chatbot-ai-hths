import { api } from "./api";
import type { ApiResponse } from "../types";

export const classApi = {
  // Lấy danh sách lớp
  listClasses: () => api.get<ApiResponse<any[]>>("/api/classes"),
  
  // Tạo lớp mới
  createClass: (data: { name: string; academicYear: string; description?: string }) => 
    api.post<ApiResponse<any>>("/api/classes", data),
    
  // Lấy danh sách thành viên lớp
  listMembers: (classId: string) => api.get<ApiResponse<any[]>>(`/api/classes/${classId}/members`),
  
  // Xác minh thành viên
  verifyMember: (classId: string, userId: string, isVerified: boolean) => 
    api.patch<ApiResponse<any>>(`/api/classes/${classId}/verify/${userId}`, { isVerified }),
    
  // Gia nhập lớp (dành cho PH/HS)
  joinClass: (classId: string) => api.post<ApiResponse<any>>("/api/classes/join", { classId }),
  
  // GV tạo user mới và thêm vào lớp
  teacherCreateUser: (data: { 
    name: string; 
    email: string; 
    password: string; 
    role: "parent" | "student"; 
    classId: string 
  }) => api.post<ApiResponse<any>>("/api/teacher/create-user", data),
};
