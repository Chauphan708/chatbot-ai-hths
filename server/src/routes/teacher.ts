/**
 * Teacher Routes — CRUD chatbots, analytics, sharing
 */

import { Router } from "express";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { 
    chatbots, 
    trainingData, 
    chatSessions, 
    studentInsights, 
    users,
    classMembers 
} from "../db/schema.js";
import { 
  requireAuth, 
  requireRole, 
  validateBody, 
  validateParams, 
  uuidParamSchema, 
  asyncHandler, 
  AppError, 
  getParam 
} from "../middleware/index.js";
import { auth } from "../auth/index.js";

const router = Router();

// All teacher routes require auth + teacher role
router.use(requireAuth, requireRole("teacher"));

// ─── Validation Schemas ─────────────────────────

const createBotSchema = z.object({
  name: z.string().min(3).max(50),
  subject: z.string(),
  gradeLevel: z.number().min(1).max(12),
  systemPrompt: z.string().optional(),
  botPersona: z.string().optional(),
  scaffoldingDefault: z.number().min(1).max(5).default(1),
  enableSixHats: z.boolean().default(false),
  maxDailyChats: z.number().min(1).max(100).default(10),
  classId: z.string().uuid().nullable().optional(),
});

const updateBotSchema = createBotSchema.partial();

const createTrainingDataSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(10),
});

// ─── Helpers ────────────────────────────────────

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Routes ─────────────────────────────────────

/** GET /teacher/bots — Danh sách bot của GV */
router.get(
  "/bots",
  asyncHandler(async (req, res) => {
    const teacherBots = await db
      .select()
      .from(chatbots)
      .where(eq(chatbots.teacherId, req.user!.id))
      .orderBy(desc(chatbots.createdAt));

    res.json({ success: true, data: teacherBots });
  })
);

/** POST /teacher/bots — Tạo chatbot mới */
router.post(
  "/bots",
  validateBody(createBotSchema),
  asyncHandler(async (req, res) => {
    const shareCode = generateShareCode();

    const [newBot] = await db
      .insert(chatbots)
      .values({
        teacherId: req.user!.id,
        shareCode,
        ...req.body,
      })
      .returning();

    res.status(201).json({ success: true, data: newBot });
  })
);

/** GET /teacher/bots/:id — Chi tiết bot */
router.get(
  "/bots/:id",
  validateParams(uuidParamSchema),
  asyncHandler(async (req, res) => {
    const [bot] = await db
      .select()
      .from(chatbots)
      .where(
        and(
          eq(chatbots.id, getParam(req, "id")),
          eq(chatbots.teacherId, req.user!.id)
        )
      );

    if (!bot) throw new AppError(404, "Không tìm thấy chatbot");

    // Get insights (students needing support)
    const insights = await db
      .select({
        insight: studentInsights,
        studentName: users.name,
        studentEmail: users.email,
      })
      .from(studentInsights)
      .innerJoin(users, eq(studentInsights.studentId, users.id))
      .where(eq(studentInsights.chatbotId, bot.id))
      .orderBy(desc(studentInsights.errorCount));

    // Get session stats
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.chatbotId, bot.id));

    const uniqueStudents = new Set(sessions.map((s) => s.studentId)).size;
    const totalMessages = sessions.reduce((acc, s) => acc + s.messagesCount, 0);

    res.json({
      success: true,
      data: {
        ...bot,
        stats: {
          uniqueStudents,
          totalMessages,
          needsSupport: insights.filter((i) => i.insight.needsSupport).length,
        },
        insights,
      },
    });
  })
);

/** PUT /teacher/bots/:id — Cập nhật bot */
router.put(
  "/bots/:id",
  validateParams(uuidParamSchema),
  validateBody(updateBotSchema),
  asyncHandler(async (req, res) => {
    const [updated] = await db
      .update(chatbots)
      .set({ ...req.body, updatedAt: new Date() })
      .where(
        and(
          eq(chatbots.id, getParam(req, "id")),
          eq(chatbots.teacherId, req.user!.id)
        )
      )
      .returning();

    if (!updated) throw new AppError(404, "Không tìm thấy chatbot");

    res.json({ success: true, data: updated });
  })
);

/** GET /teacher/bots/:id/sessions — Lịch sử chat của bot */
router.get(
  "/bots/:id/sessions",
  validateParams(uuidParamSchema),
  asyncHandler(async (req, res) => {
    const sessions = await db
      .select({
        session: chatSessions,
        studentName: users.name,
      })
      .from(chatSessions)
      .innerJoin(users, eq(chatSessions.studentId, users.id))
      .where(eq(chatSessions.chatbotId, getParam(req, "id")))
      .orderBy(desc(chatSessions.startedAt))
      .limit(50);

    res.json({ success: true, data: sessions });
  })
);

/** POST /teacher/bots/:id/clone — Clone bot cho đồng nghiệp */
router.post(
  "/bots/:id/clone",
  validateParams(uuidParamSchema),
  asyncHandler(async (req, res) => {
    const [sourceBot] = await db
      .select()
      .from(chatbots)
      .where(eq(chatbots.id, getParam(req, "id")));

    if (!sourceBot) throw new AppError(404, "Không tìm thấy chatbot gốc");

    const newShareCode = generateShareCode();
    const [clonedBot] = await db
      .insert(chatbots)
      .values({
        teacherId: req.user!.id,
        name: `${sourceBot.name} (bản sao)`,
        subject: sourceBot.subject,
        gradeLevel: sourceBot.gradeLevel,
        systemPrompt: sourceBot.systemPrompt,
        botPersona: sourceBot.botPersona,
        scaffoldingDefault: sourceBot.scaffoldingDefault,
        enableSixHats: sourceBot.enableSixHats,
        shareCode: newShareCode,
      })
      .returning();

    // Clone training data
    const sourceData = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.chatbotId, sourceBot.id));

    if (sourceData.length > 0) {
      await db.insert(trainingData).values(
        sourceData.map((d) => ({
          chatbotId: clonedBot.id,
          title: d.title,
          content: d.content,
          commonMistakes: d.commonMistakes,
          scaffoldingHints: d.scaffoldingHints,
          embedding: d.embedding,
        }))
      );
    }

    res.status(201).json({
      success: true,
      data: clonedBot,
      message: `Đã clone thành công! Mã chia sẻ mới: ${newShareCode}`,
    });
  })
);

/** GET /teacher/bots/:id/share — Lấy link chia sẻ */
router.get(
  "/bots/:id/share",
  validateParams(uuidParamSchema),
  asyncHandler(async (req, res) => {
    const [bot] = await db
      .select()
      .from(chatbots)
      .where(
        and(
          eq(chatbots.id, getParam(req, "id")),
          eq(chatbots.teacherId, req.user!.id)
        )
      );

    if (!bot) throw new AppError(404, "Không tìm thấy chatbot");

    const shareLink = `${process.env.CLIENT_URL}/chat/${bot.shareCode}`;

    res.json({
      success: true,
      data: {
        shareCode: bot.shareCode,
        shareLink,
        cloneLink: `${process.env.CLIENT_URL}/clone/${bot.shareCode}`,
      },
    });
  })
);

/** ─── NEW: User Management by Teacher ─── */

/** POST /teacher/create-user — GV tạo tài khoản cho PH/HS */
router.post(
  "/create-user",
  asyncHandler(async (req, res) => {
    const { name, email, password, role, classId } = req.body;

    if (!name || !email || !password || !role || !classId) {
      throw new AppError(400, "Thiếu thông tin bắt buộc");
    }

    if (!["parent", "student"].includes(role)) {
      throw new AppError(400, "Vai trò không hợp lệ");
    }

    // 1. Tạo user bằng Better Auth (Server-side API)
    const newUser = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role,
      },
    });

    if (!newUser) {
      throw new AppError(500, "Lỗi khi tạo tài khoản");
    }

    // 2. Tự động thêm vào lớp và Đã xác minh (vì GV tạo)
    await db.insert(classMembers).values({
      classId,
      userId: newUser.user.id,
      role: role,
      isVerified: true,
    });

    res.status(201).json({
      success: true,
      message: "Tạo tài khoản thành công",
      data: newUser.user,
    });
  })
);

export default router;
