/**
 * Teacher Settings Routes — API Key Management
 *
 * Cho phép GV quản lý Gemini API key riêng.
 * Routes: GET/PUT/DELETE /api/teacher/api-key
 */

import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import {
  requireAuth,
  requireRole,
  validateBody,
  asyncHandler,
  AppError,
} from "../middleware/index.js";

const router = Router();

// All routes require teacher auth
router.use(requireAuth, requireRole("teacher"));

// ─── Validation Schemas ─────────────────────────

const saveApiKeySchema = z.object({
  apiKey: z.string().min(10, "API key không hợp lệ").max(256),
});

// ─── Routes ─────────────────────────────────────

/** GET /api/teacher/api-key — Kiểm tra GV đã có API key chưa */
router.get(
  "/api-key",
  asyncHandler(async (req, res) => {
    const [teacher] = await db
      .select({ geminiApiKey: users.geminiApiKey })
      .from(users)
      .where(eq(users.id, req.user!.id));

    if (!teacher) throw new AppError(404, "Không tìm thấy tài khoản");

    res.json({
      success: true,
      data: { hasKey: !!teacher.geminiApiKey },
    });
  })
);

/** PUT /api/teacher/api-key — Lưu API key */
router.put(
  "/api-key",
  validateBody(saveApiKeySchema),
  asyncHandler(async (req, res) => {
    const { apiKey } = req.body;

    const [updated] = await db
      .update(users)
      .set({ geminiApiKey: apiKey, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning({ id: users.id });

    if (!updated) throw new AppError(404, "Không tìm thấy tài khoản");

    res.json({
      success: true,
      message: "Đã lưu API key thành công",
    });
  })
);

/** DELETE /api/teacher/api-key — Xóa API key */
router.delete(
  "/api-key",
  asyncHandler(async (req, res) => {
    const [updated] = await db
      .update(users)
      .set({ geminiApiKey: null, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning({ id: users.id });

    if (!updated) throw new AppError(404, "Không tìm thấy tài khoản");

    res.json({
      success: true,
      message: "Đã xóa API key",
    });
  })
);

export default router;
