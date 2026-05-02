/**
 * Parent Routes — Manage children accounts, view chat history
 */

import { Router } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  users,
  parentChildren,
  chatSessions,
  chatMessages,
  studentProgress,
  accounts,
} from "../db/schema.js";
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

const router = Router();

// All parent routes require auth + parent role
router.use(requireAuth, requireRole("parent"));

// ─── Validation Schemas ─────────────────────────

const createChildSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// ─── Routes ─────────────────────────────────────

/** GET /parent/children — Danh sách con */
router.get(
  "/children",
  asyncHandler(async (req, res) => {
    const children = await db
      .select({
        relation: parentChildren,
        child: {
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          createdAt: users.createdAt,
        },
      })
      .from(parentChildren)
      .innerJoin(users, eq(parentChildren.childId, users.id))
      .where(eq(parentChildren.parentId, req.user!.id));

    res.json({ success: true, data: children.map((c) => c.child) });
  })
);

/** POST /parent/children — Tạo tài khoản con */
router.post(
  "/children",
  validateBody(createChildSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Check if email already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existing) {
      throw new AppError(409, "Email đã được sử dụng");
    }

    // Hash password
    const bcrypt = await import("better-auth/crypto");
    const hashedPassword = await bcrypt.hashPassword(password);

    // Create student account (Users table)
    const [child] = await db
      .insert(users)
      .values({
        email,
        role: "student",
        name,
        emailVerified: true, 
      })
      .returning();

    // Create account record (Accounts table for Better Auth compatibility)
    await db.insert(accounts).values({
      userId: child.id,
      accountId: email,
      providerId: "email",
      password: hashedPassword,
    });

    // Link parent → child
    await db.insert(parentChildren).values({
      parentId: req.user!.id,
      childId: child.id,
    });

    res.status(201).json({
      success: true,
      data: {
        id: child.id,
        email: child.email,
        name: child.name,
      },
      message: `Đã tạo tài khoản cho ${name}`,
    });
  })
);

/** GET /parent/children/:id/history — Lịch sử chat của con */
router.get(
  "/children/:id/history",
  validateParams(uuidParamSchema),
  asyncHandler(async (req, res) => {
    // Verify parent-child relationship
    const [relation] = await db
      .select()
      .from(parentChildren)
      .where(
        and(
          eq(parentChildren.parentId, req.user!.id),
          eq(parentChildren.childId, getParam(req, "id"))
        )
      );

    if (!relation) {
      throw new AppError(403, "Không có quyền xem thông tin này");
    }

    // Get recent chat sessions
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.studentId, getParam(req, "id")))
      .orderBy(desc(chatSessions.startedAt))
      .limit(20);

    res.json({ success: true, data: sessions });
  })
);

/** GET /parent/children/:id/session/:sessionId — Xem chi tiết tin nhắn trong một phiên */
router.get(
  "/children/:id/session/:sessionId",
  validateParams(
    z.object({
      id: z.string().uuid(),
      sessionId: z.string().uuid(),
    })
  ),
  asyncHandler(async (req, res) => {
    const childId = getParam(req, "id");
    const sessionId = getParam(req, "sessionId");

    // Verify parent-child relationship
    const [relation] = await db
      .select()
      .from(parentChildren)
      .where(
        and(
          eq(parentChildren.parentId, req.user!.id),
          eq(parentChildren.childId, childId)
        )
      );

    if (!relation) {
      throw new AppError(403, "Không có quyền xem thông tin này");
    }

    // Verify session belongs to child
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.studentId, childId)
        )
      );

    if (!session) {
      throw new AppError(404, "Phiên chat không tồn tại");
    }

    // Get messages
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);

    res.json({ success: true, data: { session, messages } });
  })
);

/** GET /parent/children/:id/progress — Tiến độ học tập của con */
router.get(
  "/children/:id/progress",
  validateParams(uuidParamSchema),
  asyncHandler(async (req, res) => {
    // Verify parent-child relationship
    const [relation] = await db
      .select()
      .from(parentChildren)
      .where(
        and(
          eq(parentChildren.parentId, req.user!.id),
          eq(parentChildren.childId, getParam(req, "id"))
        )
      );

    if (!relation) {
      throw new AppError(403, "Không có quyền xem thông tin này");
    }

    const progress = await db
      .select()
      .from(studentProgress)
      .where(eq(studentProgress.studentId, getParam(req, "id")));

    res.json({ success: true, data: progress });
  })
);

export default router;
