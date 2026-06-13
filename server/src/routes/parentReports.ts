/**
 * Parent Reports Routes — Báo cáo & thông báo cho PH
 *
 * Xem/tạo báo cáo tuần, quản lý tùy chọn thông báo.
 */

import { Router } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  parentReports,
  parentChildren,
  notificationPreferences,
} from "../db/schema.js";
import {
  requireAuth,
  requireRole,
  validateBody,
  asyncHandler,
  AppError,
} from "../middleware/index.js";
import { reportService } from "../services/reports/index.js";

const router = Router();

// All routes require parent auth
router.use(requireAuth, requireRole("parent"));

// ─── Validation Schemas ─────────────────────────

const generateReportSchema = z.object({
  childId: z.string().uuid("ID con không hợp lệ"),
});

const updateNotifSchema = z.object({
  channel: z.enum(["email"]),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  isEnabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Routes ─────────────────────────────────────

/** GET /parent/reports — Danh sách báo cáo đã tạo */
router.get(
  "/reports",
  asyncHandler(async (req, res) => {
    const reports = await db
      .select()
      .from(parentReports)
      .where(eq(parentReports.parentId, req.user!.id))
      .orderBy(desc(parentReports.createdAt));

    res.json({ success: true, data: reports });
  })
);

/** POST /parent/reports/generate — Tạo báo cáo tuần theo yêu cầu */
router.post(
  "/reports/generate",
  validateBody(generateReportSchema),
  asyncHandler(async (req, res) => {
    const { childId } = req.body;
    const parentId = req.user!.id;

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
      throw new AppError(403, "Không có quyền xem thông tin của học sinh này");
    }

    try {
      const report = await reportService.generateWeeklyReport(parentId, childId);
      res.status(201).json({ success: true, data: report });
    } catch (error: any) {
      throw new AppError(500, error.message || "Lỗi khi tạo báo cáo");
    }
  })
);

/** GET /parent/notifications — Lấy tùy chọn thông báo */
router.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, req.user!.id));

    res.json({ success: true, data: prefs });
  })
);

/** PUT /parent/notifications — Cập nhật tùy chọn thông báo */
router.put(
  "/notifications",
  validateBody(updateNotifSchema),
  asyncHandler(async (req, res) => {
    const { channel, frequency, isEnabled, metadata } = req.body;
    const userId = req.user!.id;

    // Upsert notification preference
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.channel, channel)
        )
      );

    if (existing) {
      await db
        .update(notificationPreferences)
        .set({ frequency, isEnabled, metadata: metadata || null })
        .where(eq(notificationPreferences.id, existing.id));
    } else {
      await db.insert(notificationPreferences).values({
        userId,
        channel,
        frequency,
        isEnabled,
        metadata: metadata || null,
      });
    }

    res.json({ success: true, message: "Đã cập nhật tùy chọn thông báo" });
  })
);

export default router;
