/**
 * Training Routes — Manage training data with RAG embedding
 *
 * Separate from teacher.ts to keep files focused.
 * All routes require teacher role.
 */

import { Router } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { chatbots, trainingData } from "../db/schema.js";
import {
  requireAuth,
  requireRole,
  validateBody,
  validateParams,
  uuidParamSchema,
  asyncHandler,
  AppError,
  getParam,
} from "../middleware/index.js";
import { embedTrainingData, embedAllForChatbot } from "../services/rag/index.js";
import { defaultTemplates } from "../services/ai/promptTemplates.js";

const router = Router();
router.use(requireAuth, requireRole("teacher"));

// ─── Schemas ─────────────────────────────────────

const addTrainingDataSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().min(1).max(50000),
  commonMistakes: z.array(z.string()).optional(),
  scaffoldingHints: z.record(z.string()).optional(),
});

const updateTrainingDataSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).max(50000).optional(),
  commonMistakes: z.array(z.string()).optional(),
  scaffoldingHints: z.record(z.string()).optional(),
});

const bulkTrainingSchema = z.object({
  items: z.array(addTrainingDataSchema).min(1).max(20),
});

// ─── Helper: verify bot ownership ────────────────

async function verifyBotOwnership(botId: string, teacherId: string) {
  const [bot] = await db
    .select()
    .from(chatbots)
    .where(and(eq(chatbots.id, botId), eq(chatbots.teacherId, teacherId)));
  if (!bot) throw new AppError(404, "Không tìm thấy chatbot");
  return bot;
}

// ─── Routes ──────────────────────────────────────

/** GET /training/templates — Danh sách prompt templates mẫu */
router.get(
  "/templates",
  asyncHandler(async (_req, res) => {
    res.json({ success: true, data: defaultTemplates });
  })
);

/** GET /training/:botId/data — Danh sách training data của bot */
router.get(
  "/:botId/data",
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const data = await db
      .select({
        id: trainingData.id,
        title: trainingData.title,
        content: trainingData.content,
        commonMistakes: trainingData.commonMistakes,
        scaffoldingHints: trainingData.scaffoldingHints,
        hasEmbedding: trainingData.embedding,
        createdAt: trainingData.createdAt,
      })
      .from(trainingData)
      .where(eq(trainingData.chatbotId, botId))
      .orderBy(desc(trainingData.createdAt));

    // Map hasEmbedding to boolean
    const result = data.map((d) => ({
      ...d,
      hasEmbedding: d.hasEmbedding !== null,
    }));

    res.json({ success: true, data: result });
  })
);

/** POST /training/:botId/data — Thêm training data + auto embed */
router.post(
  "/:botId/data",
  validateBody(addTrainingDataSchema),
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const [newData] = await db
      .insert(trainingData)
      .values({
        chatbotId: botId,
        title: req.body.title,
        content: req.body.content,
        commonMistakes: req.body.commonMistakes ?? null,
        scaffoldingHints: req.body.scaffoldingHints ?? null,
      })
      .returning();

    // Auto-embed in background (don't block response)
    embedTrainingData(newData.id, req.body.content).catch((err) => {
      console.error(`Failed to embed training data ${newData.id}:`, err);
    });

    res.status(201).json({
      success: true,
      data: newData,
      message: "Đã thêm dữ liệu. Embedding đang được tạo...",
    });
  })
);

/** POST /training/:botId/data/bulk — Thêm nhiều training data */
router.post(
  "/:botId/data/bulk",
  validateBody(bulkTrainingSchema),
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const inserted = await db
      .insert(trainingData)
      .values(
        req.body.items.map((item: z.infer<typeof addTrainingDataSchema>) => ({
          chatbotId: botId,
          title: item.title,
          content: item.content,
          commonMistakes: item.commonMistakes ?? null,
          scaffoldingHints: item.scaffoldingHints ?? null,
        }))
      )
      .returning();

    // Auto-embed all in background
    embedAllForChatbot(botId).catch((err) => {
      console.error(`Failed batch embed for bot ${botId}:`, err);
    });

    res.status(201).json({
      success: true,
      data: inserted,
      message: `Đã thêm ${inserted.length} mục. Embedding đang được tạo...`,
    });
  })
);

/** PUT /training/:botId/data/:id — Cập nhật training data */
router.put(
  "/:botId/data/:id",
  validateBody(updateTrainingDataSchema),
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    const dataId = getParam(req, "id");
    await verifyBotOwnership(botId, req.user!.id);

    const [updated] = await db
      .update(trainingData)
      .set(req.body)
      .where(
        and(eq(trainingData.id, dataId), eq(trainingData.chatbotId, botId))
      )
      .returning();

    if (!updated) throw new AppError(404, "Không tìm thấy dữ liệu");

    // Re-embed if content changed
    if (req.body.content) {
      embedTrainingData(updated.id, req.body.content).catch((err) => {
        console.error(`Failed to re-embed ${updated.id}:`, err);
      });
    }

    res.json({ success: true, data: updated });
  })
);

/** DELETE /training/:botId/data/:id — Xóa training data */
router.delete(
  "/:botId/data/:id",
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    const dataId = getParam(req, "id");
    await verifyBotOwnership(botId, req.user!.id);

    const [deleted] = await db
      .delete(trainingData)
      .where(
        and(eq(trainingData.id, dataId), eq(trainingData.chatbotId, botId))
      )
      .returning();

    if (!deleted) throw new AppError(404, "Không tìm thấy dữ liệu");

    res.json({ success: true, message: "Đã xóa dữ liệu" });
  })
);

/** POST /training/:botId/embed-all — Re-embed tất cả training data */
router.post(
  "/:botId/embed-all",
  asyncHandler(async (req, res) => {
    const botId = getParam(req, "botId");
    await verifyBotOwnership(botId, req.user!.id);

    const result = await embedAllForChatbot(botId);

    res.json({
      success: true,
      data: result,
      message: `Đã embed ${result.processed} mục, ${result.errors} lỗi.`,
    });
  })
);

export default router;
