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

    // Kiểm tra trùng tên và năm học
    const [duplicate] = await db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.teacherId, req.user!.id),
          eq(classes.name, name),
          eq(classes.academicYear, academicYear)
        )
      );

    if (duplicate) {
      return res.status(400).json({ success: false, error: "Lớp học này đã tồn tại trong năm học này" });
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

// 6. Cập nhật lớp học
router.put(
  "/:id",
  requireAuth,
  requireRole("teacher"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, academicYear, description } = req.body;

    // Kiểm tra sở hữu
    const [existing] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, id), eq(classes.teacherId, req.user!.id)));

    if (!existing) {
      return res.status(404).json({ success: false, error: "Không tìm thấy lớp học" });
    }

    // Nếu thay đổi tên hoặc năm học, kiểm tra trùng lặp với lớp khác
    if ((name && name !== existing.name) || (academicYear && academicYear !== existing.academicYear)) {
      const targetName = name || existing.name;
      const targetYear = academicYear || existing.academicYear;

      const [duplicate] = await db
        .select()
        .from(classes)
        .where(
          and(
            eq(classes.teacherId, req.user!.id),
            eq(classes.name, targetName),
            eq(classes.academicYear, targetYear)
          )
        );

      if (duplicate && duplicate.id !== id) {
        return res.status(400).json({ success: false, error: "Tên lớp và năm học này đã được sử dụng cho lớp khác" });
      }
    }

    const [updatedClass] = await db
      .update(classes)
      .set({
        name: name || existing.name,
        academicYear: academicYear || existing.academicYear,
        description: description !== undefined ? description : existing.description,
        updatedAt: new Date(),
      })
      .where(eq(classes.id, id))
      .returning();

    res.json({ success: true, data: updatedClass });
  })
);

// 7. Xóa lớp học
router.delete(
  "/:id",
  requireAuth,
  requireRole("teacher"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Kiểm tra sở hữu
    const [existing] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, id), eq(classes.teacherId, req.user!.id)));

    if (!existing) {
      return res.status(404).json({ success: false, error: "Không tìm thấy lớp học" });
    }

    await db.delete(classes).where(eq(classes.id, id));

    res.json({ success: true, message: "Đã xóa lớp học thành công" });
  })
);

export default router;
