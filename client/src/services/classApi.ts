import api from "./api";

export const classApi = {
  // Lấy danh sách lớp
  listClasses: () => api.get("/classes"),
  
  // Tạo lớp mới
  createClass: (data: { name: string; academicYear: string; description?: string }) => 
    api.post("/classes", data),
    
  // Lấy danh sách thành viên lớp
  listMembers: (classId: string) => api.get(`/classes/${classId}/members`),
  
  // Xác minh thành viên
  verifyMember: (classId: string, userId: string, isVerified: boolean) => 
    api.patch(`/classes/${classId}/verify/${userId}`, { isVerified }),
    
  // Gia nhập lớp (dành cho PH/HS)
  joinClass: (classId: string) => api.post("/classes/join", { classId }),
  
  // GV tạo user mới và thêm vào lớp
  teacherCreateUser: (data: { 
    name: string; 
    email: string; 
    password: string; 
    role: "parent" | "student"; 
    classId: string 
  }) => api.post("/teacher/create-user", data),
};
