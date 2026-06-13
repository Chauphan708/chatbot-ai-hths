import { auth } from "../src/auth/index.js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from server directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function createDemoTeacher() {
  console.log("🚀 Đang khởi tạo tài khoản Giáo viên Demo...");
  
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email: "giaovien.demo@gmail.com",
        password: "Password123!",
        name: "Giáo viên Demo",
        role: "teacher"
      }
    });

    console.log("✅ Kết quả:", result);
    console.log("\n-----------------------------------");
    console.log("TÀI KHOẢN GIÁO VIÊN DEMO:");
    console.log("- Email: giaovien.demo@gmail.com");
    console.log("- Mật khẩu: Password123!");
    console.log("- Vai trò: teacher");
    console.log("-----------------------------------\n");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi tạo tài khoản:", error);
    process.exit(1);
  }
}

createDemoTeacher();
