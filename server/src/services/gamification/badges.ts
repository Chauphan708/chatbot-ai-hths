/**
 * Gamification Badges & Quest Progress
 *
 * Hệ thống huy hiệu và nhiệm vụ hàng ngày cho HS.
 */

import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  studentProgress,
  questProgress,
  dailyQuests,
  chatSessions,
} from "../../db/schema.js";

// ─── Badge Definitions ──────────────────────────

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (stats: StudentStats) => boolean;
}

export interface StudentStats {
  totalXp: number;
  streakDays: number;
  totalSessions: number;
  completedQuests: number;
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  first_chat: {
    id: "first_chat",
    name: "Bước Đầu Tiên",
    description: "Hoàn thành phiên chat đầu tiên",
    icon: "🌱",
    check: (stats) => stats.totalSessions >= 1,
  },
  streak_3: {
    id: "streak_3",
    name: "Chăm Chỉ 3 Ngày",
    description: "Duy trì streak 3 ngày liên tiếp",
    icon: "🔥",
    check: (stats) => stats.streakDays >= 3,
  },
  streak_7: {
    id: "streak_7",
    name: "Tuần Lễ Kiên Trì",
    description: "Duy trì streak 7 ngày liên tiếp",
    icon: "⚡",
    check: (stats) => stats.streakDays >= 7,
  },
  streak_30: {
    id: "streak_30",
    name: "Chiến Binh Tháng",
    description: "Duy trì streak 30 ngày liên tiếp",
    icon: "👑",
    check: (stats) => stats.streakDays >= 30,
  },
  xp_100: {
    id: "xp_100",
    name: "Nhà Thám Hiểm",
    description: "Đạt 100 XP",
    icon: "⭐",
    check: (stats) => stats.totalXp >= 100,
  },
  xp_1000: {
    id: "xp_1000",
    name: "Bậc Thầy Tri Thức",
    description: "Đạt 1000 XP",
    icon: "🏆",
    check: (stats) => stats.totalXp >= 1000,
  },
  quest_master: {
    id: "quest_master",
    name: "Thợ Săn Nhiệm Vụ",
    description: "Hoàn thành 10 nhiệm vụ",
    icon: "🎯",
    check: (stats) => stats.completedQuests >= 10,
  },
};

// ─── Core Functions ──────────────────────────────

/**
 * Kiểm tra và cấp huy hiệu mới cho HS.
 * Trả về danh sách huy hiệu mới được cấp.
 */
export async function checkAndAwardBadges(
  studentId: string,
  chatbotId: string
): Promise<string[]> {
  // Get current progress
  const [progress] = await db
    .select()
    .from(studentProgress)
    .where(
      and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.chatbotId, chatbotId)
      )
    );

  if (!progress) return [];

  // Count total sessions
  const [sessionCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.studentId, studentId),
        eq(chatSessions.chatbotId, chatbotId)
      )
    );

  // Count completed quests
  const [questCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.studentId, studentId),
        eq(questProgress.isCompleted, true)
      )
    );

  const stats: StudentStats = {
    totalXp: progress.totalXp,
    streakDays: progress.streakDays,
    totalSessions: sessionCount?.count ?? 0,
    completedQuests: questCount?.count ?? 0,
  };

  const currentBadges = (progress.badges as string[]) || [];
  const newBadges: string[] = [];

  // Check each badge definition
  for (const [badgeId, badge] of Object.entries(BADGE_DEFINITIONS)) {
    if (!currentBadges.includes(badgeId) && badge.check(stats)) {
      newBadges.push(badgeId);
    }
  }

  // Award new badges
  if (newBadges.length > 0) {
    const updatedBadges = [...currentBadges, ...newBadges];
    await db
      .update(studentProgress)
      .set({ badges: updatedBadges })
      .where(
        and(
          eq(studentProgress.studentId, studentId),
          eq(studentProgress.chatbotId, chatbotId)
        )
      );
  }

  return newBadges;
}

/**
 * Cập nhật tiến độ nhiệm vụ cho HS.
 * Tự động đánh dấu hoàn thành nếu đạt target.
 */
export async function updateQuestProgress(
  studentId: string,
  questType: string,
  incrementBy: number = 1
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Find today's quests matching the type
  const todayQuests = await db
    .select()
    .from(dailyQuests)
    .where(
      and(
        eq(dailyQuests.questType, questType),
        eq(dailyQuests.date, today)
      )
    );

  for (const quest of todayQuests) {
    // Get or create quest progress
    const [existing] = await db
      .select()
      .from(questProgress)
      .where(
        and(
          eq(questProgress.questId, quest.id),
          eq(questProgress.studentId, studentId)
        )
      );

    if (existing) {
      if (existing.isCompleted) continue; // Already completed

      const newValue = existing.currentValue + incrementBy;
      const isCompleted = newValue >= quest.targetValue;

      await db
        .update(questProgress)
        .set({
          currentValue: newValue,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        })
        .where(eq(questProgress.id, existing.id));
    } else {
      const isCompleted = incrementBy >= quest.targetValue;

      await db.insert(questProgress).values({
        questId: quest.id,
        studentId,
        currentValue: incrementBy,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      });
    }
  }
}

// ─── Export ──────────────────────────────────────

export const badgeService = {
  BADGE_DEFINITIONS,
  checkAndAwardBadges,
  updateQuestProgress,
};
