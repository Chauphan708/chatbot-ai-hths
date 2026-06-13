/**
 * Parent Reports Service
 *
 * Tạo báo cáo tuần/tháng cho PH về tiến độ học tập của con.
 */

import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  users,
  parentChildren,
  chatSessions,
  chatMessages,
  studentProgress,
  studentInsights,
  parentReports,
} from "../../db/schema.js";

// ─── Types ───────────────────────────────────────

export interface ReportContent {
  childName: string;
  period: string;
  totalSessions: number;
  totalMessages: number;
  xpEarned: number;
  currentLevel: number;
  currentStreak: number;
  topTopics: string[];
  weakTopics: string[];
  recommendations: string[];
  newBadges: string[];
}

// ─── Core Functions ──────────────────────────────

/**
 * Tạo báo cáo tuần cho PH.
 * Tổng hợp dữ liệu 7 ngày gần nhất.
 */
export async function generateWeeklyReport(
  parentId: string,
  childId: string
): Promise<ReportContent> {
  // Verify parent-child relationship
  const [relation] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId)
      )
    );

  if (!relation) {
    throw new Error("Không có quyền xem thông tin con");
  }

  // Get child info
  const [child] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, childId));

  if (!child) throw new Error("Không tìm thấy tài khoản học sinh");

  // Date range: last 7 days
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const periodStart = weekAgo.toISOString().split("T")[0];
  const periodEnd = now.toISOString().split("T")[0];

  // Session stats for the week
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.studentId, childId),
        gte(chatSessions.startedAt, weekAgo)
      )
    );

  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((sum, s) => sum + s.messagesCount, 0);
  const xpEarned = sessions.reduce((sum, s) => sum + s.xpEarned, 0);

  // Current progress (across all bots, pick best)
  const progressList = await db
    .select()
    .from(studentProgress)
    .where(eq(studentProgress.studentId, childId))
    .orderBy(desc(studentProgress.totalXp));

  const bestProgress = progressList[0];
  const currentLevel = bestProgress?.level ?? 1;
  const currentStreak = bestProgress?.streakDays ?? 0;

  // Collect all badges across bots
  const allBadges = new Set<string>();
  for (const p of progressList) {
    const badges = (p.badges as string[]) || [];
    badges.forEach((b) => allBadges.add(b));
  }

  // Insights: top topics (low errors) vs weak topics (high errors)
  const insights = await db
    .select()
    .from(studentInsights)
    .where(eq(studentInsights.studentId, childId))
    .orderBy(desc(studentInsights.errorCount));

  const weakTopics = insights
    .filter((i) => i.errorCount >= 3)
    .slice(0, 5)
    .map((i) => i.topic);

  const topTopics = insights
    .filter((i) => i.errorCount < 3)
    .slice(0, 5)
    .map((i) => i.topic);

  // Generate recommendations based on data
  const recommendations: string[] = [];

  if (totalSessions === 0) {
    recommendations.push("Con chưa học trong tuần này. Hãy khuyến khích con dành ít nhất 15 phút mỗi ngày.");
  }
  if (currentStreak >= 3) {
    recommendations.push(`Tuyệt vời! Con đã duy trì streak ${currentStreak} ngày liên tiếp. Hãy động viên con tiếp tục!`);
  }
  if (weakTopics.length > 0) {
    recommendations.push(`Con cần ôn lại các chủ đề: ${weakTopics.join(", ")}.`);
  }
  if (totalMessages > 0 && totalMessages < 10) {
    recommendations.push("Con có thể tăng thời gian tương tác với chatbot để hiểu sâu hơn.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Con đang học tập tốt. Hãy tiếp tục duy trì nhé!");
  }

  const reportContent: ReportContent = {
    childName: child.name,
    period: `${periodStart} → ${periodEnd}`,
    totalSessions,
    totalMessages,
    xpEarned,
    currentLevel,
    currentStreak,
    topTopics,
    weakTopics,
    recommendations,
    newBadges: Array.from(allBadges),
  };

  // Save report to database
  await db.insert(parentReports).values({
    parentId,
    childId,
    reportType: "weekly",
    periodStart,
    periodEnd,
    content: reportContent,
  });

  return reportContent;
}

// ─── Export ──────────────────────────────────────

export const reportService = {
  generateWeeklyReport,
};
