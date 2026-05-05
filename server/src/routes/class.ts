import { Router } from "express";
import { db } from "../db/index.js";
import { classes, classMembers, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { 
  requireAuth, 
  requireRole, 
  asyncHandler 
} from "../middleware/index.js";

const router = Router();

// 1. Tạo lớp học mới
router.post(
  "/", 
  requireAuth, 
  requireRole("teacher"), 
  asyncHandler(async (req, res) => {
    const { name, academicYear, description } = req.body;
    if (!name || !academicYear) {
      return res.status(400).json({ success: false, error: "Thiếu tên lớp hoặc năm học" });
    }

    const [newClass] = await db.insert(classes).values({
      name,
      academicYear,
      description,
      teacherId: req.user!.id,
    }).returning();

    res.status(201).json({ success: true, data: newClass });
  })
);

// 2. Lấy danh sách lớp học của GV hiện tại
router.get(
  "/", 
  requireAuth, 
  requireRole("teacher"), 
  asyncHandler(async (req, res) => {
    const teacherClasses = await db.query.classes.findMany({
      where: eq(classes.teacherId, req.user!.id),
      with: {
        members: true,
      },
      orderBy: (classes, { desc }) => [desc(classes.createdAt)],
    });
    res.json({ success: true, data: teacherClasses });
  })
);

// 3. Lấy danh sách thành viên trong lớp
router.get(
  "/:id/members", 
  requireAuth, 
  requireRole("teacher"), 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const members = await db.query.classMembers.findMany({
      where: eq(classMembers.classId, id),
      with: {
        user: true,
      },
    });
    res.json({ success: true, data: members });
  })
);

// 4. Phê duyệt/Xác minh thành viên
router.patch(
  "/:id/verify/:userId", 
  requireAuth, 
  requireRole("teacher"), 
  asyncHandler(async (req, res) => {
    const { id, userId } = req.params;
    const { isVerified } = req.body;

    // Kiểm tra xem lớp này có đúng của GV này không
    const classData = await db.query.classes.findFirst({
      where: and(eq(classes.id, id), eq(classes.teacherId, req.user!.id)),
    });

    if (!classData) {
      return res.status(404).json({ success: false, error: "Không tìm thấy lớp học" });
    }

    await db
      .update(classMembers)
      .set({ isVerified: !!isVerified })
      .where(and(eq(classMembers.classId, id), eq(classMembers.userId, userId)));

    res.json({ success: true });
  })
);

// 5. PH/HS xin gia nhập lớp (Dành cho role Parent/Student)
router.post(
  "/join", 
  requireAuth, 
  asyncHandler(async (req, res) => {
    const { classId } = req.body;
    if (!classId) return res.status(400).json({ success: false, error: "Thiếu ID lớp học" });

    // Kiểm tra lớp tồn tại
    const classData = await db.query.classes.findFirst({
      where: eq(classes.id, classId),
    });
    if (!classData) return res.status(404).json({ success: false, error: "Lớp học không tồn tại" });

    // Thêm vào danh sách chờ duyệt
    await db.insert(classMembers).values({
      classId,
      userId: req.user!.id,
      role: req.user!.role,
      isVerified: false,
    });

    res.status(201).json({ success: true, message: "Đã gửi yêu cầu gia nhập lớp" });
  })
);

export default router;
