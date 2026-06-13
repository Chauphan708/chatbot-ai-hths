import { Router } from "express";
import { db } from "../db/index.js";
import { users, chatSessions, chatMessages, classes, chatbots } from "../db/schema.js";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { 
  requireAuth, 
  requireRole, 
  asyncHandler 
} from "../middleware/index.js";

const router = Router();

// Phải là Admin mới được vào tất cả các route này
router.use(requireAuth, requireRole("admin"));

// 1. Lấy danh sách Giáo viên (có lọc)
router.get("/teachers", asyncHandler(async (req, res) => {
  const { search, verified } = req.query;
  
  let conditions = [eq(users.role, "teacher")];
  
  if (search) {
    conditions.push(or(
      ilike(users.name, `%${search}%`),
      ilike(users.email, `%${search}%`)
    )!);
  }
  
  if (verified !== undefined) {
    conditions.push(eq(users.isVerified, verified === "true"));
  }

  const teachers = await db.query.users.findMany({
    where: and(...conditions),
    orderBy: [desc(users.createdAt)],
  });
  res.json({ success: true, data: teachers });
}));

// 2. Phê duyệt/Hủy phê duyệt Giáo viên
router.patch("/teachers/:id/verify", asyncHandler(async (req, res) => {
  const id = req.params.id as string;
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

// 3. Lấy toàn bộ hội thoại của hệ thống (có lọc)
router.get("/conversations", asyncHandler(async (req, res) => {
  const { search, classId } = req.query;

  let conditions = [];

  if (classId) {
    // Tìm các chatbot thuộc lớp này
    const classBots = await db.select({ id: chatbots.id }).from(chatbots).where(eq(chatbots.classId, classId as string));
    const botIds = classBots.map(b => b.id);
    if (botIds.length > 0) {
      conditions.push(sql`${chatSessions.chatbotId} IN ${botIds}`);
    } else {
      return res.json({ success: true, data: [] });
    }
  }

  const allSessions = await db.query.chatSessions.findMany({
    with: {
      student: true,
      chatbot: {
        with: {
          class: true
        }
      }
    },
    orderBy: [desc(chatSessions.startedAt)],
    limit: 200, // Tăng giới hạn lên để phục vụ xuất báo cáo
  });

  // Lọc phía server cho search (Drizzle findMany with relations search hơi phức tạp, tạm thời lọc logic hoặc dùng join)
  let filtered = allSessions;
  if (search) {
    const s = (search as string).toLowerCase();
    filtered = allSessions.filter(session => 
      session.student?.name?.toLowerCase().includes(s) || 
      session.student?.email?.toLowerCase().includes(s) ||
      session.chatbot?.name?.toLowerCase().includes(s)
    );
  }

  res.json({ success: true, data: filtered });
}));

// 4. Xem chi tiết một hội thoại
router.get("/conversations/:id", asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  
  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.id, id),
    with: {
      student: true,
      chatbot: true,
      messages: {
        orderBy: [desc(chatMessages.createdAt)],
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
