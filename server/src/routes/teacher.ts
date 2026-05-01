/**
 * Teacher Routes — CRUD chatbots, analytics, sharing
 */

import { Router } from "express";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatbots, trainingData, chatSessions, studentInsights, studentProgress, users } from "../db/schema.js";
import { embedAllForChatbot } from "../services/rag/index.js";
import {
  requireAuth,
  requireRole,
  validateBody,
  validateParams,
  uuidParamSchema,
  asyncHandler,
  AppError,
  getParam,
} from "../middleware/index.js";

const router = Router();

// All teacher routes require auth + teacher role
router.use(requireAuth, requireRole("teacher"));

// ─── Validation Schemas ─────────────────────────

const createBotSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(50),
  gradeLevel: z.number().int().min(1).max(12).default(4),
  systemPrompt: z.string().max(5000).optional(),
  botPersona: z.string().max(2000).optional(),
  scaffoldingDefault: z.number().int().min(1).max(5).default(1),
  enableSixHats: z.boolean().default(false),
  maxDailyChats: z.number().int().min(1).max(50).default(10),
});

const updateBotSchema = createBotSchema.partial();

// ─── Generate unique share code ─────────────────

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

    // Get training data count
    const data = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.chatbotId, bot.id));

    res.json({
      success: true,
      data: { ...bot, trainingDataCount: data.length },
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

/** DELETE /teacher/bots/:id — Xóa bot */
router.delete(
  "/bots/:id",
  validateParams(uuidParamSchema),
  asyncHandler(async (req, res) => {
    const [deleted] = await db
      .delete(chatbots)
      .where(
        and(
          eq(chatbots.id, getParam(req, "id")),
          eq(chatbots.teacherId, req.user!.id)
        )
      )
      .returning();

    if (!deleted) throw new AppError(404, "Không tìm thấy chatbot");

    res.json({ success: true, message: "Đã xóa chatbot" });
  })
);

/** GET /teacher/bots/:id/analytics — Phân tích HS */
router.get(
  "/bots/:id/analytics",
  validateParams(uuidParamSchema),
  asyncHandler(async (req, res) => {
    // Verify bot ownership
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
        studentName: users.displayName,
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
    const totalMessages = sessions.reduce(
      (acc, s) => acc + s.messagesCount,
      0
    );

    // Get gamification leaderboard for this bot's students
    const studentIds = Array.from(new Set(sessions.map((s) => s.studentId)));
    
    let leaderboard: any[] = [];
    if (studentIds.length > 0) {
      // Find top students by XP who have interacted with this bot
      // Since studentProgress is global per student, we just show their global progress
      // but only for students who used this bot.
      
      const inClause = studentIds.map(id => `'${id}'`).join(',');
      const topStudents = await db.execute(sql`
        SELECT 
          u.display_name as "studentName", 
          sp.total_xp as "totalXp", 
          sp.level, 
          sp.streak_days as "streakDays"
        FROM student_progress sp
        JOIN users u ON u.id = sp.student_id
        WHERE sp.student_id IN (${sql.raw(inClause)})
        ORDER BY sp.total_xp DESC
        LIMIT 10
      `);
      leaderboard = topStudents.rows;
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents: uniqueStudents,
          totalSessions: sessions.length,
          totalMessages,
        },
        insights,
        leaderboard,
      },
    });
  })
);

/** GET /teacher/bots/:id/chats — Xem toàn bộ chat HS */
router.get(
  "/bots/:id/chats",
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

    const sessions = await db
      .select({
        session: chatSessions,
        studentName: users.displayName,
      })
      .from(chatSessions)
      .innerJoin(users, eq(chatSessions.studentId, users.id))
      .where(eq(chatSessions.chatbotId, bot.id))
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
    // Source bot can be any public bot or shared with code
    const [sourceBot] = await db
      .select()
      .from(chatbots)
      .where(eq(chatbots.id, getParam(req, "id")));

    if (!sourceBot) throw new AppError(404, "Không tìm thấy chatbot gốc");

    // Clone bot
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
        cloneFromId: sourceBot.id,
        maxDailyChats: sourceBot.maxDailyChats,
      })
      .returning();

    // Clone training data (without embeddings — regenerate later)
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
        }))
      );

      // Auto re-embed in background
      embedAllForChatbot(clonedBot.id).catch((err) => {
        console.error(`Failed to re-embed cloned bot ${clonedBot.id}:`, err);
      });
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

export default router;
