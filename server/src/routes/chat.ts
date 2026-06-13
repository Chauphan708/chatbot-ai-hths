/**
 * Chat Routes — Student chat with bot via share code
 *
 * Phase 1: Structured Outputs (JSON Schema) — no more Regex parsing
 * Phase 3: Image analysis via Gemini Vision
 */

import { Router } from "express";
import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  chatbots,
  chatSessions,
  chatMessages,
  dailyUsage,
  studentInsights,
  classMembers,
  users,
} from "../db/schema.js";
import {
  requireAuth,
  requireRole,
  validateBody,
  asyncHandler,
  AppError,
  getParam,
} from "../middleware/index.js";
import { geminiService, promptService, type ChatMessage as AIChatMessage, type PedagogicalResponse } from "../services/ai/index.js";
import { ragService } from "../services/rag/index.js";
import { safetyService } from "../services/safety/index.js";
import { gamificationService } from "../services/gamification/index.js";
import { cacheService } from "../services/cache/index.js";

const router = Router();

// ─── Validation Schemas ─────────────────────────

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  isVoice: z.boolean().default(false),
});

const sendImageSchema = z.object({
  image: z.string().min(1), // base64
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  message: z.string().max(2000).optional(),
  sessionId: z.string().uuid().optional(),
});

// ─── Helper: Lấy API key của GV sở hữu bot ─────

async function getTeacherApiKey(teacherId: string): Promise<string | null> {
  const [teacher] = await db
    .select({ geminiApiKey: users.geminiApiKey })
    .from(users)
    .where(eq(users.id, teacherId));
  return teacher?.geminiApiKey || null;
}

// ─── Helper: Xử lý AI response → lưu DB ────────

async function processAIResponse(
  aiResponse: PedagogicalResponse,
  currentSessionId: string,
  botId: string,
  studentId: string,
) {
  const { reply, hatMode, scaffoldingLevel, insight } = aiResponse;

  // Update scaffolding level in session if AI suggests change
  if (scaffoldingLevel && scaffoldingLevel >= 1 && scaffoldingLevel <= 5) {
    await db
      .update(chatSessions)
      .set({ scaffoldingLevel })
      .where(eq(chatSessions.id, currentSessionId));
  }

  // Update activeHat in session
  if (hatMode) {
    await db
      .update(chatSessions)
      .set({ activeHat: hatMode })
      .where(eq(chatSessions.id, currentSessionId));
  }

  // Save/Update student insight (background, non-blocking)
  if (insight) {
    saveStudentInsight(botId, studentId, insight.topic, insight.errorType).catch(err => {
      console.error("Failed to save student insight:", err);
    });
  }

  // Save bot message
  const [savedBotMessage] = await db
    .insert(chatMessages)
    .values({
      sessionId: currentSessionId,
      role: "bot",
      content: reply,
      hatMode,
      scaffoldingAction: scaffoldingLevel ? `Mức ${scaffoldingLevel}` : null,
    })
    .returning();

  // Update session message count
  await db
    .update(chatSessions)
    .set({ messagesCount: sql`${chatSessions.messagesCount} + 1` })
    .where(eq(chatSessions.id, currentSessionId));

  return savedBotMessage;
}

/** Upsert student insight */
async function saveStudentInsight(
  chatbotId: string, studentId: string,
  topic: string, errorType: string
) {
  const [existing] = await db
    .select()
    .from(studentInsights)
    .where(
      and(
        eq(studentInsights.chatbotId, chatbotId),
        eq(studentInsights.studentId, studentId),
        eq(studentInsights.topic, topic),
        eq(studentInsights.errorType, errorType)
      )
    );

  if (existing) {
    await db
      .update(studentInsights)
      .set({
        errorCount: sql`${studentInsights.errorCount} + 1`,
        needsSupport: true,
        lastOccurred: new Date(),
      })
      .where(eq(studentInsights.id, existing.id));
  } else {
    await db.insert(studentInsights).values({
      chatbotId,
      studentId,
      topic,
      errorType,
      errorCount: 1,
      needsSupport: true,
      lastOccurred: new Date(),
    });
  }
}

// ─── Helper: Chuẩn bị context chung ─────────────

async function prepareContext(bot: any, currentSessionId: string, message: string) {
  // Fetch conversation history (up to 20 messages)
  const historyData = await db
    .select({
      role: chatMessages.role,
      content: chatMessages.content,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, currentSessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(20);

  const history: AIChatMessage[] = historyData
    .reverse()
    .map((msg) => ({
      role: msg.role === "student" ? "user" as const : "model" as const,
      content: msg.content,
    }));

  // RAG search
  const ragResults = await ragService.searchTrainingData(bot.id, message, {
    topK: 3,
    minSimilarity: 0.3,
  });
  const ragContext = ragService.buildRAGContext(ragResults);

  // Build system prompt
  const [sessionData] = await db
    .select({ scaffoldingLevel: chatSessions.scaffoldingLevel })
    .from(chatSessions)
    .where(eq(chatSessions.id, currentSessionId));

  const systemPrompt = promptService.buildSystemPrompt({
    botName: bot.name,
    subject: bot.subject,
    gradeLevel: bot.gradeLevel,
    persona: bot.botPersona || undefined,
    scaffoldingLevel: sessionData.scaffoldingLevel,
    enableSixHats: bot.enableSixHats,
    ragContext,
  });

  return { history, systemPrompt };
}

// ─── Helper: Access control check ───────────────

async function checkBotAccess(bot: any, studentId: string, userRole: string, userId: string) {
  if (!bot.isPublic) {
    if (!bot.classId) {
      if (userRole !== "teacher" || bot.teacherId !== userId) {
        throw new AppError(403, "Chatbot này yêu cầu tham gia lớp học để sử dụng");
      }
    } else {
      const membership = await db.query.classMembers.findFirst({
        where: and(
          eq(classMembers.classId, bot.classId),
          eq(classMembers.userId, studentId)
        ),
      });

      if (!membership || !membership.isVerified) {
        throw new AppError(
          403,
          !membership
            ? "Em cần tham gia lớp học để sử dụng chatbot này"
            : "Tài khoản của em đang chờ Giáo viên xác minh quyền truy cập"
        );
      }
    }
  }
}

// ─── Routes ─────────────────────────────────────

/** POST /chat/:shareCode — Gửi tin nhắn (HS) */
router.post(
  "/:shareCode",
  requireAuth,
  requireRole("student"),
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const shareCode = getParam(req, "shareCode");
    const { message, sessionId, isVoice } = req.body;
    const studentId = req.user!.id;

    // Find bot by share code
    const [bot] = await db
      .select()
      .from(chatbots)
      .where(
        and(eq(chatbots.shareCode, shareCode!), eq(chatbots.isActive, true))
      );

    if (!bot) {
      throw new AppError(404, "Chatbot không tồn tại hoặc đã bị tắt");
    }

    // Access control
    await checkBotAccess(bot, studentId, req.user!.role, req.user!.id);

    // Content Filter (Safety check)
    const safetyResult = safetyService.checkMessageSafety(message);
    if (!safetyResult.isSafe) {
      return res.status(400).json({
        success: false,
        error:
          safetyResult.reason === "profanity"
            ? "Thông điệp của em có chứa từ ngữ chưa phù hợp. Hãy dùng từ ngữ lịch sự hơn nhé! 🌟"
            : "Vui lòng không chia sẻ thông tin cá nhân (như số điện thoại) để đảm bảo an toàn nhé! 🛡️",
      });
    }

    // Check daily usage limit
    const today = new Date().toISOString().split("T")[0];
    const [usage] = await db
      .select()
      .from(dailyUsage)
      .where(
        and(
          eq(dailyUsage.studentId, studentId),
          eq(dailyUsage.chatbotId, bot.id),
          eq(dailyUsage.date, today)
        )
      );

    if (usage && usage.count >= bot.maxDailyChats) {
      throw new AppError(
        429,
        `Đã hết ${bot.maxDailyChats} lượt chat hôm nay. Quay lại ngày mai nhé! 🌟`
      );
    }

    // Get or create session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const [newSession] = await db
        .insert(chatSessions)
        .values({
          chatbotId: bot.id,
          studentId,
          scaffoldingLevel: bot.scaffoldingDefault,
        })
        .returning();
      currentSessionId = newSession.id;
    }

    // Save student message
    await db.insert(chatMessages).values({
      sessionId: currentSessionId,
      role: "student",
      content: message,
      isVoice,
    });

    // Update session message count
    await db
      .update(chatSessions)
      .set({
        messagesCount: sql`${chatSessions.messagesCount} + 1`,
      })
      .where(eq(chatSessions.id, currentSessionId));

    // Update daily usage
    if (usage) {
      await db
        .update(dailyUsage)
        .set({ count: sql`${dailyUsage.count} + 1` })
        .where(eq(dailyUsage.id, usage.id));
    } else {
      await db.insert(dailyUsage).values({
        studentId,
        chatbotId: bot.id,
        date: today,
        count: 1,
      });
    }

    // ─── AI Chat Engine (Structured Outputs & Cache) ──────

    // Check cache first (Phase 2)
    const cachedResponse = await cacheService.getFromCache(bot.id, message);
    let aiResponse: PedagogicalResponse;

    if (cachedResponse) {
      aiResponse = cachedResponse.responseJson as PedagogicalResponse;
    } else {
      const { history, systemPrompt } = await prepareContext(bot, currentSessionId, message);

      // Get teacher's API key
      const teacherApiKey = await getTeacherApiKey(bot.teacherId);

      try {
        aiResponse = await geminiService.generateStructuredChat(history, {
          systemPrompt,
          temperature: 0.7,
          apiKey: teacherApiKey,
        });

        // Save to cache (only if response is successful and not fallback error)
        if (aiResponse.reply && !aiResponse.reply.includes("quá tải")) {
          await cacheService.saveToCache(bot.id, message, aiResponse);
        }
      } catch (error) {
        console.error("Gemini AI Error:", error);
        aiResponse = {
          reply: "Xin lỗi em, hiện tại hệ thống đang quá tải. Em hãy thử lại sau ít phút nhé! 🌟",
          hatMode: null,
          scaffoldingLevel: null,
          insight: null,
          encouragement: null,
        };
      }
    }

    // Process & save AI response
    const savedBotMessage = await processAIResponse(
      aiResponse, currentSessionId, bot.id, studentId
    );

    // Award XP (background)
    gamificationService.awardXP(studentId, bot.id, gamificationService.XP_PER_MESSAGE).catch(err => {
      console.error("Failed to award XP:", err);
    });

    res.json({
      success: true,
      data: {
        reply: savedBotMessage.content,
        sessionId: currentSessionId,
        hatMode: savedBotMessage.hatMode || undefined,
        scaffoldingAction: savedBotMessage.scaffoldingAction || undefined,
        encouragement: aiResponse.encouragement || undefined,
        remainingChats: bot.maxDailyChats - ((usage?.count ?? 0) + 1),
      },
    });
  })
);

/** POST /chat/:shareCode/image — Gửi ảnh bài tập (Phase 3) */
router.post(
  "/:shareCode/image",
  requireAuth,
  requireRole("student"),
  validateBody(sendImageSchema),
  asyncHandler(async (req, res) => {
    const shareCode = getParam(req, "shareCode");
    const { image, mimeType, message, sessionId } = req.body;
    const studentId = req.user!.id;

    // Find bot
    const [bot] = await db
      .select()
      .from(chatbots)
      .where(
        and(eq(chatbots.shareCode, shareCode!), eq(chatbots.isActive, true))
      );

    if (!bot) {
      throw new AppError(404, "Chatbot không tồn tại hoặc đã bị tắt");
    }

    await checkBotAccess(bot, studentId, req.user!.role, req.user!.id);

    // Daily limit check
    const today = new Date().toISOString().split("T")[0];
    const [usage] = await db
      .select()
      .from(dailyUsage)
      .where(
        and(
          eq(dailyUsage.studentId, studentId),
          eq(dailyUsage.chatbotId, bot.id),
          eq(dailyUsage.date, today)
        )
      );

    if (usage && usage.count >= bot.maxDailyChats) {
      throw new AppError(429, `Đã hết lượt chat hôm nay. Quay lại ngày mai nhé! 🌟`);
    }

    // Get or create session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const [newSession] = await db
        .insert(chatSessions)
        .values({ chatbotId: bot.id, studentId, scaffoldingLevel: bot.scaffoldingDefault })
        .returning();
      currentSessionId = newSession.id;
    }

    // Save student message (with image indicator)
    const studentContent = message
      ? `[📷 Ảnh bài tập]\n${message}`
      : "[📷 Ảnh bài tập] Em gửi ảnh bài tập để nhờ hướng dẫn.";

    await db.insert(chatMessages).values({
      sessionId: currentSessionId,
      role: "student",
      content: studentContent,
    });

    await db
      .update(chatSessions)
      .set({ messagesCount: sql`${chatSessions.messagesCount} + 1` })
      .where(eq(chatSessions.id, currentSessionId));

    // Update daily usage
    if (usage) {
      await db.update(dailyUsage)
        .set({ count: sql`${dailyUsage.count} + 1` })
        .where(eq(dailyUsage.id, usage.id));
    } else {
      await db.insert(dailyUsage).values({
        studentId, chatbotId: bot.id, date: today, count: 1,
      });
    }

    // Build system prompt
    const [sessionData] = await db
      .select({ scaffoldingLevel: chatSessions.scaffoldingLevel })
      .from(chatSessions)
      .where(eq(chatSessions.id, currentSessionId));

    const systemPrompt = promptService.buildSystemPrompt({
      botName: bot.name,
      subject: bot.subject,
      gradeLevel: bot.gradeLevel,
      persona: bot.botPersona || undefined,
      scaffoldingLevel: sessionData.scaffoldingLevel,
      enableSixHats: bot.enableSixHats,
    });

    // Get teacher's API key
    const teacherApiKey = await getTeacherApiKey(bot.teacherId);

    let aiResponse: PedagogicalResponse;
    try {
      aiResponse = await geminiService.generateFromImage(
        image, mimeType,
        message || "Hãy phân tích bài tập trong ảnh và hướng dẫn em giải.",
        { systemPrompt, apiKey: teacherApiKey }
      );
    } catch (error) {
      console.error("Gemini Vision Error:", error);
      aiResponse = {
        reply: "Xin lỗi em, không đọc được ảnh. Em hãy chụp lại rõ hơn nhé! 📸",
        hatMode: null, scaffoldingLevel: null, insight: null, encouragement: null,
      };
    }

    const savedBotMessage = await processAIResponse(
      aiResponse, currentSessionId, bot.id, studentId
    );

    gamificationService.awardXP(studentId, bot.id, gamificationService.XP_PER_MESSAGE).catch(err => {
      console.error("Failed to award XP:", err);
    });

    res.json({
      success: true,
      data: {
        reply: savedBotMessage.content,
        sessionId: currentSessionId,
        hatMode: savedBotMessage.hatMode || undefined,
        scaffoldingAction: savedBotMessage.scaffoldingAction || undefined,
        encouragement: aiResponse.encouragement || undefined,
        remainingChats: bot.maxDailyChats - ((usage?.count ?? 0) + 1),
      },
    });
  })
);

/** GET /chat/:shareCode/history — Lịch sử chat (HS) */
router.get(
  "/:shareCode/history",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const shareCode = getParam(req, "shareCode");
    const studentId = req.user!.id;

    const [bot] = await db
      .select()
      .from(chatbots)
      .where(eq(chatbots.shareCode, shareCode!));

    if (!bot) throw new AppError(404, "Chatbot không tồn tại");

    // Get recent sessions
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.chatbotId, bot.id),
          eq(chatSessions.studentId, studentId)
        )
      )
      .orderBy(sql`${chatSessions.startedAt} DESC`)
      .limit(10);

    res.json({ success: true, data: sessions });
  })
);

/** GET /chat/:shareCode/session/:sessionId — Tin nhắn trong phiên */
router.get(
  "/:shareCode/session/:sessionId",
  requireAuth,
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const sessionId = getParam(req, "sessionId");
    const studentId = req.user!.id;

    // Verify session belongs to student
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.studentId, studentId)
        )
      );

    if (!session) throw new AppError(404, "Phiên chat không tồn tại");

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);

    res.json({ success: true, data: { session, messages } });
  })
);

/** GET /chat/:shareCode/info — Thông tin bot (public) */
router.get(
  "/:shareCode/info",
  asyncHandler(async (req, res) => {
    const shareCode = getParam(req, "shareCode");

    const [bot] = await db
      .select({
        name: chatbots.name,
        subject: chatbots.subject,
        gradeLevel: chatbots.gradeLevel,
        botPersona: chatbots.botPersona,
        isActive: chatbots.isActive,
      })
      .from(chatbots)
      .where(eq(chatbots.shareCode, shareCode!));

    if (!bot) throw new AppError(404, "Chatbot không tồn tại");

    res.json({ success: true, data: bot });
  })
);

export default router;
