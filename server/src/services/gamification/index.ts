/**
 * Gamification Service
 *
 * Handles student XP, leveling, and streak calculations.
 */

import { eq, sql, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { studentProgress } from "../../db/schema.js";

// ─── Constants ───────────────────────────────────

export const XP_PER_MESSAGE = 5;
export const XP_PER_SESSION_COMPLETED = 20;

// ─── Core Logic ──────────────────────────────────

/**
 * Calculate level based on XP.
 * Simple curve: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 300 XP, Level N = N * (N-1) * 50
 * Or simpler: Level = Math.floor(Math.sqrt(XP / 50)) + 1
 */
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

/**
 * Award XP to a student and update their level and streak.
 */
export async function awardXP(studentId: string, chatbotId: string, amount: number): Promise<void> {
  const [progress] = await db
    .select()
    .from(studentProgress)
    .where(
      and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.chatbotId, chatbotId)
      )
    );

  const now = new Date();

  if (!progress) {
    // Initialize progress for new student
    await db.insert(studentProgress).values({
      studentId,
      chatbotId,
      totalXp: amount,
      level: calculateLevel(amount),
      streakDays: 1,
      lastActiveAt: now,
    });
    return;
  }

  // Update existing progress
  let newStreak = progress.streakDays;
  const lastActive = progress.lastActiveAt;

  if (lastActive) {
    const todayStr = now.toISOString().split("T")[0];
    const lastActiveStr = lastActive.toISOString().split("T")[0];

    if (lastActiveStr !== todayStr) {
      // Check if it was yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastActiveStr === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1; // Streak broken
      }
    }
  } else {
    newStreak = 1;
  }

  const newXp = progress.totalXp + amount;
  const newLevel = calculateLevel(newXp);

  await db
    .update(studentProgress)
    .set({
      totalXp: newXp,
      level: newLevel,
      streakDays: newStreak,
      lastActiveAt: now,
    })
    .where(
      and(
        eq(studentProgress.studentId, studentId),
        eq(studentProgress.chatbotId, chatbotId)
      )
    );
}

export const gamificationService = {
  awardXP,
  calculateLevel,
  XP_PER_MESSAGE,
  XP_PER_SESSION_COMPLETED,
};
