/**
 * Report Scheduler Cron Job
 *
 * Tự động chạy báo cáo hàng tuần vào lúc 9:00 sáng Chủ Nhật (Giờ Việt Nam ICT - UTC+7).
 * Tạo báo cáo học tập và gửi email cho Phụ huynh có đăng ký nhận thông báo.
 */

import cron from "node-cron";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  users,
  parentChildren,
  notificationPreferences,
  parentReports,
} from "../db/schema.js";
import { reportService } from "../services/reports/index.js";
import { emailService } from "../services/email/index.js";

/**
 * Chạy tiến trình tạo báo cáo tuần và gửi email cho toàn bộ Phụ huynh đăng ký.
 */
export async function runWeeklyReports(): Promise<void> {
  console.log(`[Scheduler] Bắt đầu tiến trình tạo báo cáo tuần tự động: ${new Date().toISOString()}`);

  try {
    // 1. Lấy tất cả Phụ huynh bật nhận thông báo Email hàng tuần
    const weeklyPrefs = await db
      .select({
        userId: notificationPreferences.userId,
        metadata: notificationPreferences.metadata,
        parentName: users.name,
        parentEmail: users.email,
      })
      .from(notificationPreferences)
      .innerJoin(users, eq(notificationPreferences.userId, users.id))
      .where(
        and(
          eq(notificationPreferences.channel, "email"),
          eq(notificationPreferences.frequency, "weekly"),
          eq(notificationPreferences.isEnabled, true)
        )
      );

    console.log(`[Scheduler] Tìm thấy ${weeklyPrefs.length} phụ huynh đăng ký nhận báo cáo tuần.`);

    let successCount = 0;
    let failCount = 0;

    for (const pref of weeklyPrefs) {
      const parentId = pref.userId;
      // Dùng email tài khoản phụ huynh hoặc từ metadata cài đặt nếu có
      const parentEmail = (pref.metadata as any)?.email || pref.parentEmail;

      if (!parentEmail) {
        console.warn(`[Scheduler] Phụ huynh ${pref.parentName} (${parentId}) không có địa chỉ email.`);
        continue;
      }

      // 2. Lấy danh sách con của phụ huynh này
      const children = await db
        .select({
          childId: parentChildren.childId,
        })
        .from(parentChildren)
        .where(eq(parentChildren.parentId, parentId));

      if (children.length === 0) {
        console.log(`[Scheduler] Phụ huynh ${pref.parentName} chưa liên kết với học sinh nào.`);
        continue;
      }

      console.log(`[Scheduler] Phụ huynh ${pref.parentName} có ${children.length} con. Tiến hành tạo báo cáo...`);

      for (const child of children) {
        try {
          // 3. Tạo báo cáo tuần (tự động lưu vào parent_reports trong DB)
          const reportContent = await reportService.generateWeeklyReport(parentId, child.childId);

          // 4. Gửi email thông báo cho phụ huynh
          const emailResult = await emailService.sendWeeklyReport(parentEmail, reportContent);

          if (emailResult.success) {
            // 5. Cập nhật trạng thái đã gửi trong cơ sở dữ liệu cho báo cáo vừa tạo
            const [latestReport] = await db
              .select({ id: parentReports.id })
              .from(parentReports)
              .where(
                and(
                  eq(parentReports.parentId, parentId),
                  eq(parentReports.childId, child.childId),
                  eq(parentReports.reportType, "weekly")
                )
              )
              .orderBy(desc(parentReports.createdAt))
              .limit(1);

            if (latestReport) {
              await db
                .update(parentReports)
                .set({
                  sentAt: new Date(),
                  sentVia: "email",
                })
                .where(eq(parentReports.id, latestReport.id));
            }
            successCount++;
          } else {
            console.error(`[Scheduler] Không thể gửi email báo cáo cho phụ huynh ${parentEmail}: ${emailResult.error}`);
            failCount++;
          }
        } catch (childErr: any) {
          console.error(`[Scheduler] Lỗi khi tạo/gửi báo cáo cho con ${child.childId} của PH ${pref.parentName}:`, childErr);
          failCount++;
        }
      }
    }

    console.log(`[Scheduler] Tiến trình hoàn tất. Gửi thành công: ${successCount}, Thất bại: ${failCount}`);
  } catch (error) {
    console.error("[Scheduler] Lỗi nghiêm trọng trong cron job:", error);
  }
}

/**
 * Khởi tạo Cron Job chạy định kỳ hàng tuần.
 * Lịch chạy: "0 9 * * 0" (9:00 AM Chủ Nhật hàng tuần, giờ Asia/Ho_Chi_Minh).
 */
export function initReportScheduler(): void {
  console.log("[Scheduler] Khởi tạo bộ lập lịch báo cáo tự động (Asia/Ho_Chi_Minh)...");

  // "0 9 * * 0" -> 9h sáng Chủ Nhật hàng tuần
  cron.schedule("0 9 * * 0", async () => {
    await runWeeklyReports();
  }, {
    timezone: "Asia/Ho_Chi_Minh"
  });

  console.log("[Scheduler] Đã kích hoạt lịch biểu: 9:00 sáng Chủ Nhật hàng tuần (Asia/Ho_Chi_Minh)");
}

export const reportScheduler = {
  runWeeklyReports,
  initReportScheduler,
};
