/**
 * Email Service using Resend API
 *
 * Gửi email báo cáo tiến độ tuần cho Phụ huynh với thiết kế glassmorphic cao cấp.
 */

import { env } from "../../config/env.js";
import { ReportContent } from "../reports/index.js";

/**
 * Tạo HTML template cho báo cáo tuần của học sinh.
 * Sử dụng CSS nâng cao, gradient và thiết kế glassmorphism hiện đại.
 */
function generateWeeklyReportHtml(report: ReportContent): string {
  const {
    childName,
    period,
    totalSessions,
    totalMessages,
    xpEarned,
    currentLevel,
    currentStreak,
    topTopics,
    weakTopics,
    recommendations,
    newBadges,
  } = report;

  // Render top topics
  const topTopicsHtml = topTopics.length > 0
    ? topTopics.map(t => `<span class="badge badge-success">${t}</span>`).join(" ")
    : '<span class="empty-text">Chưa có đủ dữ liệu chủ đề thế mạnh trong tuần này.</span>';

  // Render weak topics
  const weakTopicsHtml = weakTopics.length > 0
    ? weakTopics.map(t => `<span class="badge badge-warning">${t}</span>`).join(" ")
    : '<span class="empty-text">Tuyệt vời! Con không gặp khó khăn lớn nào trong tuần này.</span>';

  // Render badges
  const badgesHtml = newBadges.length > 0
    ? newBadges.map(b => `
        <div class="badge-item">
          <div class="badge-icon">🎖️</div>
          <div class="badge-name">${b}</div>
        </div>
      `).join("")
    : '<div class="empty-text">Con chưa mở khóa huy hiệu mới trong tuần này. Cố gắng lên nhé!</div>';

  // Render recommendations
  const recsHtml = recommendations.map(r => `
    <li class="rec-item">
      <div class="rec-bullet">✦</div>
      <div class="rec-text">${r}</div>
    </li>
  `).join("");

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo học tập tuần - GócHọc AI</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0b0f19;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, rgba(23, 28, 41, 0.9) 0%, rgba(13, 17, 28, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
      padding: 35px 40px;
      text-align: center;
      position: relative;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      color: #c084fc;
      font-size: 14px;
      font-weight: 500;
    }
    .content {
      padding: 40px;
    }
    .welcome {
      margin-top: 0;
      font-size: 18px;
      color: #ffffff;
      font-weight: 600;
      line-height: 1.5;
    }
    .grid {
      display: table;
      width: 100%;
      margin: 25px 0;
      border-collapse: separate;
      border-spacing: 12px;
    }
    .grid-row {
      display: table-row;
    }
    .card {
      display: table-cell;
      width: 50%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      vertical-align: top;
    }
    .card-val {
      font-size: 28px;
      font-weight: 800;
      color: #818cf8;
      margin: 5px 0;
    }
    .card-val.xp { color: #f59e0b; }
    .card-val.streak { color: #ec4899; }
    .card-val.level { color: #10b981; }
    .card-lbl {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin: 30px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-container {
      margin: 10px 0;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 12px;
      margin: 4px;
    }
    .badge-success {
      background-color: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .badge-warning {
      background-color: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .badge-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 15px 0;
    }
    .badge-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 12px 16px;
      display: inline-block;
      margin: 6px;
      text-align: center;
      min-width: 100px;
    }
    .badge-icon {
      font-size: 24px;
      margin-bottom: 6px;
    }
    .badge-name {
      font-size: 12px;
      color: #e2e8f0;
      font-weight: 600;
    }
    .rec-list {
      list-style: none;
      padding: 0;
      margin: 15px 0;
    }
    .rec-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
      background: rgba(79, 70, 229, 0.05);
      border-left: 3px solid #6366f1;
      padding: 12px 16px;
      border-radius: 0 12px 12px 0;
    }
    .rec-bullet {
      color: #818cf8;
      font-weight: bold;
      margin-right: 12px;
      font-size: 16px;
      line-height: 1;
    }
    .rec-text {
      font-size: 14px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .empty-text {
      font-size: 13px;
      color: #64748b;
      font-style: italic;
    }
    .footer {
      background-color: #080c14;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .footer p {
      margin: 5px 0;
      font-size: 12px;
      color: #475569;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
    .cta-btn {
      display: inline-block;
      background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 30px;
      border-radius: 14px;
      margin: 25px 0 10px 0;
      text-align: center;
      box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>📊 BÁO CÁO HỌC TẬP TUẦN</h1>
        <p>GócHọc AI — Đồng hành cùng con kiến tạo tri thức</p>
      </div>
      <div class="content">
        <p class="welcome">Kính gửi Quý phụ huynh,</p>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 25px;">
          GócHọc AI xin gửi tới Quý phụ huynh báo cáo tóm tắt quá trình tự học và tiến bộ của con <strong>${childName}</strong> trong tuần qua (<strong>${period}</strong>).
        </p>

        <div class="section-title">⚡ Hoạt động trong tuần</div>
        
        <div class="grid">
          <div class="grid-row">
            <div class="card">
              <div class="card-val">${totalSessions}</div>
              <div class="card-lbl">Phiên học tập</div>
            </div>
            <div class="card">
              <div class="card-val">${totalMessages}</div>
              <div class="card-lbl">Tin nhắn trao đổi</div>
            </div>
          </div>
          <div class="grid-row">
            <div class="card">
              <div class="card-val xp">+${xpEarned}</div>
              <div class="card-lbl">XP Tích lũy</div>
            </div>
            <div class="card">
              <div class="card-val streak">${currentStreak} ngày</div>
              <div class="card-lbl">Streak học tập</div>
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="display: inline-block; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.1); border-radius: 12px; padding: 10px 20px; margin-bottom: 15px;">
            <span style="font-size: 14px; color: #94a3b8;">Cấp độ hiện tại:</span>
            <span style="font-size: 18px; font-weight: 800; color: #10b981; margin-left: 8px;">Cấp ${currentLevel}</span>
          </div>
        </div>

        <div class="section-title">🎯 Chủ đề kiến thức</div>
        <div style="margin-bottom: 20px;">
          <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 8px; font-weight: 600;">🌟 Điểm mạnh (Con học tập tốt nhất):</p>
          <div class="badge-container">
            ${topTopicsHtml}
          </div>
        </div>
        <div style="margin-bottom: 25px;">
          <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 8px; font-weight: 600;">⚠️ Chủ đề cần cải thiện (Mắc lỗi sai nhiều nhất):</p>
          <div class="badge-container">
            ${weakTopicsHtml}
          </div>
        </div>

        <div class="section-title">🏅 Huy hiệu đạt được</div>
        <div style="margin-bottom: 25px; text-align: center;">
          ${badgesHtml}
        </div>

        <div class="section-title">💡 Gợi ý sư phạm cho phụ huynh</div>
        <ul class="rec-list">
          ${recsHtml}
        </ul>

        <div style="text-align: center; margin-top: 35px;">
          <p style="font-size: 13px; color: #94a3b8;">Để theo dõi chi tiết lịch sử trò chuyện và quá trình tiến bộ hàng ngày của con, vui lòng nhấn nút bên dưới:</p>
          <a href="${env.CLIENT_URL}/parent" class="cta-btn">Truy cập Trang phụ huynh</a>
        </div>
      </div>
      <div class="footer">
        <p>Báo cáo này được tự động tạo bởi hệ thống GócHọc AI.</p>
        <p>Nếu Quý phụ huynh có bất kỳ thắc mắc hoặc góp ý nào, vui lòng liên hệ với nhà trường hoặc Giáo viên chủ nhiệm.</p>
        <p>© 2026 GócHọc AI. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Gửi email báo cáo tuần qua Resend API.
 */
export async function sendWeeklyReport(
  toEmail: string,
  report: ReportContent
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!env.RESEND_API_KEY) {
    console.warn(
      `[Email Service] RESEND_API_KEY chưa được cấu hình. Ghi nhận nội dung email gửi đến ${toEmail}:`,
      JSON.stringify(report, null, 2)
    );
    return { success: true, error: "RESEND_API_KEY is not configured, logged email content" };
  }

  const html = generateWeeklyReportHtml(report);
  const subject = `📊 Báo cáo học tập tuần của con ${report.childName} — GócHọc AI`;
  const from = `GócHọc AI <${env.RESEND_FROM_EMAIL}>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject,
        html,
      }),
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error("[Email Service] Resend API Error:", data);
      return { success: false, error: data.message || "Failed to send email" };
    }

    console.log(`[Email Service] Đã gửi báo cáo tuần cho ${toEmail} thành công. Resend ID: ${String(data.id)}`);
    return { success: true, id: data.id };
  } catch (error: any) {
    console.error("[Email Service] Exception during email send:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

export const emailService = {
  sendWeeklyReport,
};
