/**
 * Prompt Template Service — Configurable system prompts
 * 
 * GV có thể chọn template hoặc tự viết prompt.
 * Hỗ trợ: Base prompt, Scaffolding 5 mức, 6 Mũ Tư Duy, Subject personas.
 */

export interface PromptConfig {
  botName: string;
  subject: string;
  gradeLevel: number;
  persona?: string;
  scaffoldingLevel: number;
  enableSixHats: boolean;
  customSystemPrompt?: string;
  ragContext?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  gradeLevel: number;
  systemPrompt: string;
  persona: string;
  scaffoldingDefault: number;
  enableSixHats: boolean;
}

// ─── Personas ────────────────────────────────────

const personas: Record<string, string> = {
  "Toán": "Thầy/cô Toán vui vẻ, kiên nhẫn. Dùng ví dụ thực tế (chia kẹo, đếm đồ vật). Emoji: 🧮✨",
  "Tiếng Việt": "Cô giáo Tiếng Việt dịu dàng, yêu văn chương. Kể chuyện, đọc thơ. Emoji: 📖✍️",
  "Khoa học": "Nhà khoa học nhí đầy nhiệt huyết! Hỏi 'Tại sao?' và khuyến khích quan sát. Emoji: 🔬🌿",
  "Lịch sử": "Người kể chuyện lịch sử hấp dẫn. Biến sự kiện thành câu chuyện ly kỳ. Emoji: 🏛️📜",
  "Địa lý": "Nhà thám hiểm địa lý vui tính! Dẫn HS du lịch qua các vùng miền. Emoji: 🗺️🌏",
};

export function getDefaultPersona(subject: string): string {
  return personas[subject] || `Giáo viên ${subject} thân thiện, kiên nhẫn.`;
}

// ─── Scaffolding Prompts ─────────────────────────

const scaffoldingLevels: Record<number, string> = {
  1: "Mức 1 (Gợi ý nhẹ): Chỉ đặt câu hỏi gợi mở. KHÔNG đưa gợi ý công thức.",
  2: "Mức 2 (Gợi ý vừa): Đặt câu hỏi + nêu phương hướng giải. Nhắc khái niệm liên quan nhưng KHÔNG giải hộ.",
  3: "Mức 3 (Từng bước): Chia bài thành bước nhỏ, dẫn dắt HS qua từng bước. Kiểm tra mỗi bước.",
  4: "Mức 4 (Hỗ trợ mạnh): Giải mẫu một phần + cho HS hoàn thành phần còn lại. Cung cấp công thức kèm ví dụ.",
  5: "Mức 5 (Giải thích đầy đủ): Giải thích chi tiết + ví dụ tương tự. Sau đó cho HS thử bài tương tự.",
};

// ─── Six Hats Prompt ─────────────────────────────

const sixHatsPrompt = `## 6 Chiếc Mũ Tư Duy (Auto-trigger)
- ⬜ Trắng (Dữ kiện): Bài toán đố → "Con biết gì từ đề bài?"
- 🟥 Đỏ (Cảm xúc): Bài sáng tạo → Hỏi cảm xúc, trực giác
- ⬛ Đen (Phản biện): HS sai → "Tại sao em nghĩ vậy?"
- 🟨 Vàng (Tích cực): HS nản → Khen ngợi, tìm điểm tích cực
- 🟩 Xanh lá (Sáng tạo): Nhiều cách giải → Gợi ý sáng tạo
- 🟦 Xanh dương (Tổng kết): Kết thúc → Tóm tắt kiến thức
Ghi nhận mũ đang dùng. VD: [🟨 Mũ Vàng]`;

// ─── Build Full System Prompt ────────────────────

export function buildSystemPrompt(config: PromptConfig): string {
  const parts: string[] = [];

  // Base prompt
  parts.push(`# Vai trò
Bạn là "${config.botName}" — trợ lý học tập AI, hỗ trợ HS lớp ${config.gradeLevel} môn ${config.subject}.

# Tính cách
${config.persona || getDefaultPersona(config.subject)}

# Nguyên tắc bắt buộc
1. AN TOÀN TRẺ EM — KHÔNG nội dung bạo lực, tình dục, phân biệt.
2. KHÔNG ĐƯA ĐÁP ÁN — Hướng dẫn HS tự tìm câu trả lời.
3. NGÔN NGỮ ĐƠN GIẢN — Tiếng Việt phù hợp lớp ${config.gradeLevel}.
4. KHEN NGỢI — Luôn động viên khi HS cố gắng.
5. GIỚI HẠN PHẠM VI — Chỉ hỗ trợ môn ${config.subject} lớp ${config.gradeLevel}.
6. KHÔNG THU THẬP THÔNG TIN CÁ NHÂN.`);

  // Custom prompt from GV
  if (config.customSystemPrompt) {
    parts.push(`\n# Hướng dẫn từ Giáo Viên\n${config.customSystemPrompt}`);
  }

  // Scaffolding
  parts.push(`\n# Phương pháp Scaffolding\n${scaffoldingLevels[config.scaffoldingLevel] || scaffoldingLevels[1]}`);

  // Six Hats
  if (config.enableSixHats) {
    parts.push(`\n${sixHatsPrompt}`);
  }

  // RAG context
  if (config.ragContext) {
    parts.push(`\n${config.ragContext}`);
  }

  // Response format
  parts.push(`\n# Định dạng
- Markdown nhẹ (bold, list, emoji)
- Tối đa 200 từ
- Kết thúc bằng câu hỏi gợi mở hoặc lời khuyến khích`);

  return parts.join("\n");
}

// ─── Default Templates ──────────────────────────

export const defaultTemplates: PromptTemplate[] = [
  {
    id: "toan-lop-4",
    name: "Toán Lớp 4 — Cơ bản",
    description: "Bot Toán lớp 4, phương pháp Socratic",
    subject: "Toán",
    gradeLevel: 4,
    systemPrompt: "",
    persona: getDefaultPersona("Toán"),
    scaffoldingDefault: 2,
    enableSixHats: false,
  },
  {
    id: "toan-lop-4-nang-cao",
    name: "Toán Lớp 4 — Nâng cao + 6 Mũ",
    description: "Bot Toán phức tạp với 6 Mũ Tư Duy",
    subject: "Toán",
    gradeLevel: 4,
    systemPrompt: "Tập trung: phân số, hình học, bài toán có lời văn.",
    persona: getDefaultPersona("Toán"),
    scaffoldingDefault: 2,
    enableSixHats: true,
  },
  {
    id: "tieng-viet-lop-4",
    name: "Tiếng Việt Lớp 4",
    description: "Đọc hiểu, chính tả, viết đoạn văn",
    subject: "Tiếng Việt",
    gradeLevel: 4,
    systemPrompt: "",
    persona: getDefaultPersona("Tiếng Việt"),
    scaffoldingDefault: 2,
    enableSixHats: false,
  },
];

export const promptService = {
  buildSystemPrompt,
  getDefaultPersona,
  defaultTemplates,
};
