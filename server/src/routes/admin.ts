import { Router } from "express";
import { db } from "../db/index.js";
import { users, chatSessions, messages, classes } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  requireAuth, 
  requireRole, 
  asyncHandler 
} from "../middleware/index.js";

const router = Router();

// Phải là Admin mới được vào tất cả các route này
router.use(requireAuth, requireRole("admin"));

// 1. Lấy danh sách Giáo viên
router.get("/teachers", asyncHandler(async (req, res) => {
  const teachers = await db.query.users.findMany({
    where: eq(users.role, "teacher"),
    orderBy: [desc(users.createdAt)],
  });
  res.json({ success: true, data: teachers });
}));

// 2. Phê duyệt/Hủy phê duyệt Giáo viên
router.patch("/teachers/:id/verify", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body;

  const [updated] = await db
    .update(users)
    .set({ isVerified: !!isVerified })
    .where(and(eq(users.id, id), eq(users.role, "teacher")))
    .returning();

  if (!updated) {
    return res.status(404).json({ success: false, error: "Không tìm thấy giáo viên" });
  }

  res.json({ success: true, data: updated });
}));

// 3. Lấy toàn bộ hội thoại của hệ thống
router.get("/conversations", asyncHandler(async (req, res) => {
  const allSessions = await db.query.chatSessions.findMany({
    with: {
      user: true,
      chatbot: {
        with: {
          class: true
        }
      }
    },
    orderBy: [desc(chatSessions.updatedAt)],
    limit: 100,
  });
  res.json({ success: true, data: allSessions });
}));

// 4. Xem chi tiết một hội thoại
router.get("/conversations/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, id),
    with: {
      user: true,
      chatbot: true,
      messages: {
        orderBy: [desc(messages.createdAt)],
      }
    }
  });

  if (!session) {
    return res.status(404).json({ success: false, error: "Hội thoại không tồn tại" });
  }

  res.json({ success: true, data: session });
}));

// 5. Thống kê nhanh
router.get("/stats", asyncHandler(async (req, res) => {
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [teacherCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "teacher"));
  const [classCount] = await db.select({ count: sql<number>`count(*)` }).from(classes);
  const [sessionCount] = await db.select({ count: sql<number>`count(*)` }).from(chatSessions);

  res.json({
    success: true,
    data: {
      totalUsers: userCount.count,
      totalTeachers: teacherCount.count,
      totalClasses: classCount.count,
      totalConversations: sessionCount.count
    }
  });
}));

export default router;
