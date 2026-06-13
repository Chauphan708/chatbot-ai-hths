/**
 * Analytics Routes — Teacher Dashboard
 *
 * Thống kê lớp học, HS cần hỗ trợ, xu hướng lỗi.
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatbots } from "../db/schema.js";
import {
  requireAuth,
  requireRole,
  asyncHandler,
  AppError,
  getParam,
} from "../middleware/index.js";
import { analyticsService } from "../services/analytics/index.js";

const router = Router();

// All analytics routes require teacher auth
router.use(requireAuth, requireRole("teacher"));

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

/** GET /teacher/bots/:botId/analytics/overview — Thống kê tổng quan */
router.get(
  "/bots/:botId/analytics/overview",
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const stats = await analyticsService.getClassStats(botId);

    res.json({ success: true, data: stats });
  })
);

/** GET /teacher/bots/:botId/analytics/at-risk — HS cần hỗ trợ */
router.get(
  "/bots/:botId/analytics/at-risk",
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const atRisk = await analyticsService.getAtRiskStudents(botId);

    res.json({ success: true, data: atRisk });
  })
);

/** GET /teacher/bots/:botId/analytics/error-trends — Xu hướng lỗi */
router.get(
  "/bots/:botId/analytics/error-trends",
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const days = parseInt(req.query.days as string) || 30;
    const trends = await analyticsService.getErrorTrends(botId, days);

    res.json({ success: true, data: trends });
  })
);

export default router;
