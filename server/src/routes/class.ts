import { Router } from "express";
import { db } from "../db/index.js";
import { classes, classMembers, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { auth } from "../auth/index.js";
import { toNodeHandler } from "better-auth/node";

const router = Router();

// Middleware để kiểm tra xem user có phải là GV không
const isTeacher = async (req: any, res: any, next: any) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "teacher") {
    return res.status(403).json({ error: "Chỉ giáo viên mới có quyền này" });
  }
  req.user = session.user;
  next();
};

// 1. Tạo lớp học mới
router.post("/", isTeacher, async (req: any, res: any) => {
  try {
    const { name, academicYear, description } = req.body;
    if (!name || !academicYear) {
      return res.status(400).json({ error: "Thiếu tên lớp hoặc năm học" });
    }

    const [newClass] = await db.insert(classes).values({
      name,
      academicYear,
      description,
      teacherId: req.user.id,
    }).returning();

    res.status(201).json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ error: "Lỗi khi tạo lớp học" });
  }
});

// 2. Lấy danh sách lớp học của GV hiện tại
router.get("/", isTeacher, async (req: any, res: any) => {
  try {
    const teacherClasses = await db.query.classes.findMany({
      where: eq(classes.teacherId, req.user.id),
      with: {
        members: true,
      },
      orderBy: (classes, { desc }) => [desc(classes.createdAt)],
    });
    res.json(teacherClasses);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh sách lớp" });
  }
});

// 3. Lấy danh sách thành viên trong lớp
router.get("/:id/members", isTeacher, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const members = await db.query.classMembers.findMany({
      where: eq(classMembers.classId, id),
      with: {
        user: true,
      },
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh sách thành viên" });
  }
});

// 4. Phê duyệt/Xác minh thành viên
router.patch("/:id/verify/:userId", isTeacher, async (req: any, res: any) => {
  try {
    const { id, userId } = req.params;
    const { isVerified } = req.body;

    // Kiểm tra xem lớp này có đúng của GV này không
    const classData = await db.query.classes.findFirst({
      where: and(eq(classes.id, id), eq(classes.teacherId, req.user.id)),
    });

    if (!classData) {
      return res.status(404).json({ error: "Không tìm thấy lớp học" });
    }

    await db
      .update(classMembers)
      .set({ isVerified: !!isVerified })
      .where(and(eq(classMembers.classId, id), eq(classMembers.userId, userId)));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi xác minh thành viên" });
  }
});

// 5. PH/HS xin gia nhập lớp (Dành cho role Parent/Student)
router.post("/join", async (req: any, res: any) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "Chưa đăng nhập" });

  try {
    const { classId } = req.body;
    if (!classId) return res.status(400).json({ error: "Thiếu ID lớp học" });

    // Kiểm tra lớp tồn tại
    const classData = await db.query.classes.findFirst({
      where: eq(classes.id, classId),
    });
    if (!classData) return res.status(404).json({ error: "Lớp học không tồn tại" });

    // Thêm vào danh sách chờ duyệt
    await db.insert(classMembers).values({
      classId,
      userId: session.user.id,
      role: session.user.role,
      isVerified: false, // Mặc định là chưa xác minh khi tự gia nhập
    });

    res.status(201).json({ message: "Đã gửi yêu cầu gia nhập lớp" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi gia nhập lớp" });
  }
});

export default router;
