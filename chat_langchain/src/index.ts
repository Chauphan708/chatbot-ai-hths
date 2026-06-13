/**
 * LangChain integration test and demo runner.
 * 
 * To run:
 * 1. Make sure e:/antigravity_projects/ptchau1708/chatbot-ho-tro-hsth/server/.env contains GEMINI_API_KEY
 * 2. Run: npm run build && npm run start
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { geminiService } from "./services/ai/gemini.js";
import { buildSystemPrompt } from "./services/ai/promptTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from the existing server/.env file
dotenv.config({ path: path.resolve(__dirname, "../../server/.env") });

async function runDemo() {
  console.log("=== 🚀 KHỞI ĐỘNG BẢN CHẠY THỬ NGHIỆM AI VỚI LANGCHAIN ===\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ Lỗi: Không tìm thấy GEMINI_API_KEY trong tệp cấu hình server/.env!");
    process.exit(1);
  }

  console.log("✅ Đã tìm thấy GEMINI_API_KEY.");
  console.log("--------------------------------------------------\n");

  try {
    // 1. Tạo System Prompt từ promptTemplates
    const systemPrompt = buildSystemPrompt({
      botName: "Cô Thảo Toán Học",
      subject: "Toán",
      gradeLevel: 4,
      scaffoldingLevel: 2, // Gợi ý vừa
      enableSixHats: true,
      customSystemPrompt: "Hãy luôn dùng cách xưng hô thân mật là 'Cô' và gọi học sinh là 'Con'."
    });

    console.log("🤖 Đang gọi mô hình Gemini qua LangChain để sinh câu trả lời thông thường...");
    const textReply = await geminiService.generateChatResponse(
      [
        { role: "user", content: "Cô ơi, con chưa biết cách giải bài toán tìm hai số khi biết tổng và hiệu của chúng." }
      ],
      { systemPrompt }
    );
    console.log("\n📝 [Phản hồi thường từ LangChain]:");
    console.log(textReply);
    console.log("\n--------------------------------------------------\n");

    console.log("🤖 Đang gọi mô hình Gemini qua LangChain để sinh Structured Output (Pedagogical Response)...");
    const structuredReply = await geminiService.generateStructuredChat(
      [
        { role: "user", content: "Bài này con làm đúng chưa cô: 5 + 5 = 11?" }
      ],
      { systemPrompt }
    );
    console.log("\n📦 [Structured JSON Response nhận được]:");
    console.log(JSON.stringify(structuredReply, null, 2));
    console.log("\n--------------------------------------------------\n");

    console.log("🎉 Thử nghiệm LangChain hoàn tất thành công!");

  } catch (error) {
    console.error("❌ Có lỗi xảy ra trong quá trình chạy thử nghiệm:");
    console.error(error);
  }
}

runDemo();
