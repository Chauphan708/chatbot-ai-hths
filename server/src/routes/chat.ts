/**
 * Chat Routes — Student chat with bot via share code
 *
 * Sprint 1: Basic structure + daily usage tracking
 * Sprint 3: Full Prompt Engine integration
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
} from "../db/schema.js";
import {
  requireAuth,
  requireRole,
  validateBody,
  asyncHandler,
  AppError,
  getParam,
} from "../middleware/index.js";
import { geminiService, promptService, type ChatMessage as AIChatMessage } from "../services/ai/index.js";
import { ragService } from "../services/rag/index.js";
import { safetyService } from "../services/safety/index.js";
import { gamificationService } from "../services/gamification/index.js";

const router = Router();

// ─── Validation Schemas ─────────────────────────

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  isVoice: z.boolean().default(false),
});

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

    // Content Filter (Safety check)
    const safetyResult = safetyService.checkMessageSafety(message);
    if (!safetyResult.isSafe) {
      // Return a soft error to the student without using their daily limit
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

    // --- Sprint 3: AI Chat Engine Integration ---

    // 1. Fetch conversation history for this session (up to 20 messages for context)
    const historyData = await db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, currentSessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(20); // Get last 20 messages

    // Reverse to chronological order and map to Gemini format
    const history: AIChatMessage[] = historyData
      .reverse()
      .map((msg) => ({
        // Map DB roles to Gemini roles
        role: msg.role === "student" ? "user" : "model",
        content: msg.content,
      }));

    // Add current user message (since it was just inserted, but history was fetched right after? Wait, we inserted it above, so it's ALREADY in historyData. But wait, `historyData` is fetched AFTER insert? Let me check line 96).
    // Actually, let's fetch history BEFORE inserting the new message, or fetch it AFTER and it includes the new message. Yes, we inserted it at line 96. So `history` includes the new message at the end!

    // 2. Perform RAG search based on student's message
    const ragResults = await ragService.searchTrainingData(bot.id, message, {
      topK: 3,
      minSimilarity: 0.3,
    });
    const ragContext = ragService.buildRAGContext(ragResults);

    // 3. Build the System Prompt
    // Fetch session again to get current scaffolding level
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
      enableSixHats: true, // Auto-enabled for Sprint 3
      ragContext,
    });

    // 4. Call Gemini AI
    let botResponse = "";
    try {
      botResponse = await geminiService.generateChatResponse(history, {
        systemPrompt,
        temperature: 0.7,
      });
    } catch (error) {
      console.error("Gemini AI Error:", error);
      botResponse = "Xin lỗi em, hiện tại hệ thống đang quá tải. Em hãy thử lại sau ít phút nhé! 🌟";
    }

    // Save bot response
    const [savedBotMessage] = await db
      .insert(chatMessages)
      .values({
        sessionId: currentSessionId,
        role: "bot",
        content: botResponse,
      })
      .returning();

    // Update session message count for bot message
    await db
      .update(chatSessions)
      .set({
        messagesCount: sql`${chatSessions.messagesCount} + 1`,
      })
      .where(eq(chatSessions.id, currentSessionId));

    // Award XP (Gamification)
    // Run in background so it doesn't block the response
    gamificationService.awardXP(studentId, bot.id, gamificationService.XP_PER_MESSAGE).catch(err => {
      console.error("Failed to award XP:", err);
    });

    res.json({
      success: true,
      data: {
        sessionId: currentSessionId,
        botMessage: savedBotMessage,
        usage: {
          used: (usage?.count ?? 0) + 1,
          limit: bot.maxDailyChats,
        },
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
