/**
 * Analytics Service
 *
 * Phân tích dữ liệu lớp học cho GV:
 * - Error trends theo topic
 * - HS cần hỗ trợ (at-risk)
 * - Thống kê tổng quan lớp
 */

import { eq, and, sql, gte, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  studentInsights,
  chatSessions,
  studentProgress,
  users,
} from "../../db/schema.js";

// ─── Types ───────────────────────────────────────

export interface ErrorTrend {
  topic: string;
  errorType: string | null;
  totalErrors: number;
  studentCount: number;
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  topic: string;
  errorCount: number;
  lastOccurred: Date | null;
}

export interface ClassStats {
  uniqueStudents: number;
  totalMessages: number;
  totalSessions: number;
  averageXp: number;
}

// ─── Core Functions ──────────────────────────────

/**
 * Lấy xu hướng lỗi theo topic cho một chatbot.
 * GROUP BY topic + error_type, sắp xếp theo tổng lỗi giảm dần.
 */
export async function getErrorTrends(
  chatbotId: string,
  days: number = 30
): Promise<ErrorTrend[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const results = await db
    .select({
      topic: studentInsights.topic,
      errorType: studentInsights.errorType,
      totalErrors: sql<number>`SUM(${studentInsights.errorCount})::int`,
      studentCount: sql<number>`COUNT(DISTINCT ${studentInsights.studentId})::int`,
    })
    .from(studentInsights)
    .where(
      and(
        eq(studentInsights.chatbotId, chatbotId),
        gte(studentInsights.lastOccurred, sinceDate)
      )
    )
    .groupBy(studentInsights.topic, studentInsights.errorType)
    .orderBy(desc(sql`SUM(${studentInsights.errorCount})`));

  return results;
}

/**
 * Tìm HS cần hỗ trợ: error_count >= 3 trong cùng topic, 7 ngày gần nhất.
 */
export async function getAtRiskStudents(
  chatbotId: string
): Promise<AtRiskStudent[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const results = await db
    .select({
      studentId: studentInsights.studentId,
      studentName: users.name,
      studentEmail: users.email,
      topic: studentInsights.topic,
      errorCount: studentInsights.errorCount,
      lastOccurred: studentInsights.lastOccurred,
    })
    .from(studentInsights)
    .innerJoin(users, eq(studentInsights.studentId, users.id))
    .where(
      and(
        eq(studentInsights.chatbotId, chatbotId),
        gte(studentInsights.errorCount, 3),
        gte(studentInsights.lastOccurred, sevenDaysAgo)
      )
    )
    .orderBy(desc(studentInsights.errorCount));

  return results;
}

/**
 * Thống kê tổng quan lớp: unique students, total messages, avg XP.
 */
export async function getClassStats(
  chatbotId: string
): Promise<ClassStats> {
  // Session stats
  const [sessionStats] = await db
    .select({
      uniqueStudents: sql<number>`COUNT(DISTINCT ${chatSessions.studentId})::int`,
      totalMessages: sql<number>`COALESCE(SUM(${chatSessions.messagesCount}), 0)::int`,
      totalSessions: sql<number>`COUNT(*)::int`,
    })
    .from(chatSessions)
    .where(eq(chatSessions.chatbotId, chatbotId));

  // Average XP
  const [xpStats] = await db
    .select({
      averageXp: sql<number>`COALESCE(AVG(${studentProgress.totalXp}), 0)::int`,
    })
    .from(studentProgress)
    .where(eq(studentProgress.chatbotId, chatbotId));

  return {
    uniqueStudents: sessionStats?.uniqueStudents ?? 0,
    totalMessages: sessionStats?.totalMessages ?? 0,
    totalSessions: sessionStats?.totalSessions ?? 0,
    averageXp: xpStats?.averageXp ?? 0,
  };
}

// ─── Export ──────────────────────────────────────

export const analyticsService = {
  getErrorTrends,
  getAtRiskStudents,
  getClassStats,
};
