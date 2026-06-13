/**
 * Gamification Routes — Student-facing
 *
 * Leaderboard, quests, progress, badges cho HS.
 * Truy cập bằng shareCode của bot.
 */

import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  chatbots,
  studentProgress,
  dailyQuests,
  questProgress,
  users,
} from "../db/schema.js";
import {
  requireAuth,
  requireRole,
  asyncHandler,
  AppError,
  getParam,
} from "../middleware/index.js";
import { BADGE_DEFINITIONS } from "../services/gamification/badges.js";

const router = Router();

// All gamification routes require student auth
router.use(requireAuth, requireRole("student"));

// ─── Helpers ────────────────────────────────────

async function getBotByShareCode(shareCode: string) {
  const [bot] = await db
    .select()
    .from(chatbots)
    .where(eq(chatbots.shareCode, shareCode));

  if (!bot) throw new AppError(404, "Chatbot không tồn tại");
  return bot;
}

// ─── Routes ─────────────────────────────────────

/** GET /gamification/:shareCode/leaderboard — Top 20 XP trong lớp */
router.get(
  "/:shareCode/leaderboard",
  asyncHandler(async (req, res) => {
    const bot = await getBotByShareCode(getParam(req, "shareCode"));

    const leaderboard = await db
      .select({
        studentId: studentProgress.studentId,
        studentName: users.name,
        studentImage: users.image,
        totalXp: studentProgress.totalXp,
        level: studentProgress.level,
        streakDays: studentProgress.streakDays,
      })
      .from(studentProgress)
      .innerJoin(users, eq(studentProgress.studentId, users.id))
      .where(eq(studentProgress.chatbotId, bot.id))
      .orderBy(desc(studentProgress.totalXp))
      .limit(20);

    res.json({ success: true, data: leaderboard });
  })
);

/** GET /gamification/:shareCode/quests — Nhiệm vụ hôm nay + tiến độ HS */
router.get(
  "/:shareCode/quests",
  asyncHandler(async (req, res) => {
    const bot = await getBotByShareCode(getParam(req, "shareCode"));
    const studentId = req.user!.id;
    const today = new Date().toISOString().split("T")[0];

    // Get today's quests for this bot
    const quests = await db
      .select()
      .from(dailyQuests)
      .where(
        and(
          eq(dailyQuests.chatbotId, bot.id),
          eq(dailyQuests.date, today)
        )
      );

    // Get student's progress for each quest
    const questsWithProgress = await Promise.all(
      quests.map(async (quest) => {
        const [progress] = await db
          .select()
          .from(questProgress)
          .where(
            and(
              eq(questProgress.questId, quest.id),
              eq(questProgress.studentId, studentId)
            )
          );

        return {
          ...quest,
          progress: progress
            ? {
                currentValue: progress.currentValue,
                isCompleted: progress.isCompleted,
                completedAt: progress.completedAt,
              }
            : {
                currentValue: 0,
                isCompleted: false,
                completedAt: null,
              },
        };
      })
    );

    res.json({ success: true, data: questsWithProgress });
  })
);

/** GET /gamification/:shareCode/progress — Tiến độ cá nhân HS */
router.get(
  "/:shareCode/progress",
  asyncHandler(async (req, res) => {
    const bot = await getBotByShareCode(getParam(req, "shareCode"));
    const studentId = req.user!.id;

    const [progress] = await db
      .select()
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.chatbotId, bot.id)
        )
      );

    if (!progress) {
      return res.json({
        success: true,
        data: {
          totalXp: 0,
          level: 1,
          streakDays: 0,
          badges: [],
          lastActiveAt: null,
        },
      });
    }

    res.json({ success: true, data: progress });
  })
);

/** GET /gamification/:shareCode/badges — Tất cả huy hiệu + đã đạt */
router.get(
  "/:shareCode/badges",
  asyncHandler(async (req, res) => {
    const bot = await getBotByShareCode(getParam(req, "shareCode"));
    const studentId = req.user!.id;

    const [progress] = await db
      .select({ badges: studentProgress.badges })
      .from(studentProgress)
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.chatbotId, bot.id)
        )
      );

    const earnedBadges = (progress?.badges as string[]) || [];

    const allBadges = Object.values(BADGE_DEFINITIONS).map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned: earnedBadges.includes(badge.id),
    }));

    res.json({ success: true, data: allBadges });
  })
);

export default router;
