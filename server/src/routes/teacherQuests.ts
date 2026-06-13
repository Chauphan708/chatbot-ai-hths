/**
 * Teacher Quest Routes — Quản lý nhiệm vụ hàng ngày
 *
 * GV tạo/xem/xóa quest cho từng bot.
 */

import { Router } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatbots, dailyQuests } from "../db/schema.js";
import {
  requireAuth,
  requireRole,
  validateBody,
  asyncHandler,
  AppError,
  getParam,
} from "../middleware/index.js";

const router = Router();

// All routes require teacher auth
router.use(requireAuth, requireRole("teacher"));

// ─── Validation Schemas ─────────────────────────

const createQuestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  questType: z.enum(["message_count", "correct_answer", "streak"]),
  targetValue: z.number().min(1).max(100).default(3),
  xpReward: z.number().min(10).max(500).default(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có định dạng YYYY-MM-DD"),
});

// ─── Helpers ────────────────────────────────────

async function verifyBotOwnership(botId: string, teacherId: string) {
  const [bot] = await db
    .select()
    .from(chatbots)
    .where(
      and(eq(chatbots.id, botId), eq(chatbots.teacherId, teacherId))
    );

  if (!bot) throw new AppError(404, "Không tìm thấy chatbot");
  return bot;
}

// ─── Routes ─────────────────────────────────────

/** POST /teacher/bots/:botId/quests — Tạo nhiệm vụ */
router.post(
  "/bots/:botId/quests",
  validateBody(createQuestSchema),
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const { title, description, questType, targetValue, xpReward, date } = req.body;

    const [quest] = await db
      .insert(dailyQuests)
      .values({
        chatbotId: botId,
        title,
        description: description || null,
        questType,
        targetValue,
        xpReward,
        date,
        createdBy: req.user!.id,
      })
      .returning();

    res.status(201).json({ success: true, data: quest });
  })
);

/** GET /teacher/bots/:botId/quests — Danh sách nhiệm vụ */
router.get(
  "/bots/:botId/quests",
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const quests = await db
      .select()
      .from(dailyQuests)
      .where(eq(dailyQuests.chatbotId, botId))
      .orderBy(desc(dailyQuests.date));

    res.json({ success: true, data: quests });
  })
);

/** DELETE /teacher/quests/:questId — Xóa nhiệm vụ */
router.delete(
  "/quests/:questId",
  asyncHandler(async (req, res) => {
    const questId = getParam(req, "questId");

    // Verify quest belongs to teacher's bot
    const [quest] = await db
      .select({
        quest: dailyQuests,
        teacherId: chatbots.teacherId,
      })
      .from(dailyQuests)
      .innerJoin(chatbots, eq(dailyQuests.chatbotId, chatbots.id))
      .where(eq(dailyQuests.id, questId));

    if (!quest) throw new AppError(404, "Không tìm thấy nhiệm vụ");
    if (quest.teacherId !== req.user!.id) {
      throw new AppError(403, "Không có quyền xóa nhiệm vụ này");
    }

    await db.delete(dailyQuests).where(eq(dailyQuests.id, questId));

    res.json({ success: true, message: "Đã xóa nhiệm vụ" });
  })
);

export default router;
