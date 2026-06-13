import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, History, Search, FileText, Bell, Sparkles, AlertCircle, Bookmark, Calendar, CheckCircle2 } from "lucide-react";
import { GlassCard, Button, Spinner, showToast } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { parentApi } from "../../services/parentApi";
import { JoinClassModal } from "../../components/class/JoinClassModal";
import type { ChildInfo } from "../../types";

export function ParentDashboard() {
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<any | null>({ isEnabled: true, frequency: "weekly" });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [childRes, repRes, prefRes] = await Promise.all([
        parentApi.listChildren(),
        parentApi.listReports(),
        parentApi.getNotificationPrefs(),
      ]);
      setChildren(childRes.data || []);
      setReports(repRes.data || []);
      if (prefRes.data && prefRes.data.length > 0) {
        setNotifPrefs(prefRes.data[0]);
      }
    } catch (err) {
      console.error("Failed to load parent dashboard data:", err);
      showToast("Lỗi khi tải thông tin phụ huynh", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (childId: string) => {
    setGenerating(true);
    try {
      const res = await parentApi.generateReport(childId);
      if (res.data) {
        showToast("Đã phân tích và tạo báo cáo tuần mới thành công! 📊", "success");
        // Reload reports
        const repRes = await parentApi.listReports();
        setReports(repRes.data || []);
        // Set active
        setActiveReport(res.data);
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi tổng hợp báo cáo", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleNotif = async () => {
    setSavingPrefs(true);
    const nextEnabled = !notifPrefs?.isEnabled;
    try {
      await parentApi.updateNotificationPrefs({
        channel: "email",
        frequency: notifPrefs?.frequency || "weekly",
        isEnabled: nextEnabled,
      });
      setNotifPrefs((prev: any) => ({ ...prev, isEnabled: nextEnabled }));
      showToast(nextEnabled ? "Đã bật nhận báo cáo tuần qua Email 📧" : "Đã tắt nhận báo cáo email", "info");
    } catch {
      showToast("Không thể cập nhật tùy chọn thông báo", "error");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <DashboardLayout role="parent">
      {showJoinModal && (
        <JoinClassModal 
          onClose={() => setShowJoinModal(false)} 
          onJoined={() => loadData()} 
        />
      )}

      {/* Report Details Modal */}
      {activeReport && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "var(--space-4)",
          }}
        >
          <GlassCard
            padding="lg"
            style={{
              width: "100%",
              maxWidth: 640,
              maxHeight: "85vh",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => setActiveReport(null)}
              style={{
                position: "absolute",
                top: "var(--space-4)",
                right: "var(--space-4)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--glass-border)",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ marginBottom: "var(--space-5)" }}>
              <div className="flex items-center gap-2" style={{ color: "var(--primary)", fontSize: "var(--text-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <Sparkles size={14} /> Báo cáo học tập tuần
              </div>
              <h2 style={{ fontWeight: 700, fontSize: "var(--text-xl)", marginTop: 4 }}>
                Học sinh: {activeReport.content?.childName}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                Khoảng thời gian: {activeReport.content?.period}
              </p>
            </div>

            {/* Stats Summary Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", textAlign: "center" }}>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--primary)" }}>{activeReport.content?.totalSessions}</div>
                <div style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)", marginTop: 2 }}>Phiên học</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", textAlign: "center" }}>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--accent)" }}>{activeReport.content?.totalMessages}</div>
                <div style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)", marginTop: 2 }}>Tin nhắn</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", textAlign: "center" }}>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--warning)" }}>+{activeReport.content?.xpEarned}</div>
                <div style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)", marginTop: 2 }}>XP Tích lũy</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", textAlign: "center" }}>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--success)" }}>L{activeReport.content?.currentLevel}</div>
                <div style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)", marginTop: 2 }}>Cấp độ</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3)", textAlign: "center" }}>
                <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--warning)" }}>🔥 {activeReport.content?.currentStreak}</div>
                <div style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)", marginTop: 2 }}>Streak ngày</div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
              <div>
                <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--success)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={14} /> Điểm mạnh / Nắm vững
                </h4>
                {activeReport.content?.topTopics?.length === 0 ? (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Chưa tích lũy đủ dữ liệu bài tập</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {activeReport.content?.topTopics?.map((topic: string) => (
                      <span key={topic} style={{ background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 6, padding: "4px 8px", fontSize: "var(--text-xs)", color: "var(--success)" }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--danger)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={14} /> Chủ đề hay mắc lỗi / Hổng
                </h4>
                {activeReport.content?.weakTopics?.length === 0 ? (
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", background: "rgba(34, 197, 94, 0.05)", padding: "4px 8px", borderRadius: 6 }}>
                    Học tập tốt, không có chủ đề hổng nổi bật! 🎉
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {activeReport.content?.weakTopics?.map((topic: string) => (
                      <span key={topic} style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, padding: "4px 8px", fontSize: "var(--text-xs)", color: "var(--danger)" }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
              <h4 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Bookmark size={15} style={{ color: "var(--primary)" }} /> Đề xuất đồng hành cùng con từ chuyên gia
              </h4>
              <ul style={{ paddingLeft: "var(--space-4)", margin: 0, fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {activeReport.content?.recommendations?.map((rec: string, i: number) => (
                  <li key={i} style={{ marginBottom: 4 }}>{rec}</li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </div>
      )}
      
      <div className="page-header">
        <h1 className="page-header__title">👨‍👩‍👧 Phụ Huynh</h1>
        <p className="page-header__subtitle">
          Quản lý tài khoản con và đồng hành cùng tiến trình học tập
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center" style={{ padding: "var(--space-12)" }}>
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="dashboard-columns" style={{ marginTop: "var(--space-6)" }}>
          {/* Left Column: Children list */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
              <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
                Con em ({children.length})
              </h2>
              <div className="flex gap-2">
                <Button variant="secondary" icon={<Search size={16} />} onClick={() => setShowJoinModal(true)}>
                  Gia nhập lớp
                </Button>
                <Button size="sm" icon={<Plus size={16} />} onClick={() => navigate("/parent/children/add")}>
                  Thêm con
                </Button>
              </div>
            </div>

            {children.length === 0 ? (
              <GlassCard padding="lg" className="text-center">
                <Users size={48} style={{ margin: "0 auto var(--space-4)", opacity: 0.3 }} />
                <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
                  Chưa có tài khoản con nào. Thêm con để bắt đầu!
                </p>
                <Button onClick={() => navigate("/parent/children/add")} icon={<Plus size={18} />}>
                  Thêm con
                </Button>
              </GlassCard>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {children.map((child) => (
                  <GlassCard key={child.id} padding="md">
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
                      <div className="flex items-center gap-4">
                        <div className="sidebar__avatar">
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontWeight: 600 }}>{child.name}</h3>
                          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                            {child.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Sparkles size={14} />}
                          onClick={() => handleGenerateReport(child.id)}
                          loading={generating}
                        >
                          Phân tích tuần
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<History size={14} />}
                          onClick={() => navigate(`/parent/children/${child.id}/history`)}
                        >
                          Lịch sử chat
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Reports & Preferences */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
            {/* Preferences */}
            <GlassCard padding="md">
              <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(59, 130, 246, 0.15)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bell size={18} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>Tùy chọn thông báo</h3>
                  <p style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)" }}>Nhận báo cáo tiến độ tuần tự động</p>
                </div>
              </div>
              <div className="flex items-center justify-between" style={{ padding: "var(--space-2) 0" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>Báo cáo Email hàng tuần</span>
                <button
                  onClick={handleToggleNotif}
                  disabled={savingPrefs}
                  style={{
                    background: notifPrefs?.isEnabled ? "var(--primary)" : "rgba(255,255,255,0.08)",
                    border: "none",
                    borderRadius: 20,
                    width: 44,
                    height: 24,
                    position: "relative",
                    cursor: "pointer",
                    transition: "background 0.3s ease",
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      background: "white",
                      borderRadius: "50%",
                      position: "absolute",
                      top: 4,
                      left: notifPrefs?.isEnabled ? 24 : 4,
                      transition: "left 0.3s ease",
                    }}
                  />
                </button>
              </div>
            </GlassCard>

            {/* Past Reports List */}
            <GlassCard padding="md">
              <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-4)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(236, 72, 153, 0.15)", color: "hsl(330,85%,60%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>Báo cáo đã tổng hợp</h3>
                  <p style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)" }}>Các tổng hợp hàng tuần/tháng</p>
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="text-center" style={{ padding: "var(--space-6)", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                  <Calendar size={24} style={{ margin: "0 auto var(--space-2)", opacity: 0.3 }} />
                  Chưa có báo cáo học tập nào được tạo. Chọn "Phân tích tuần" ở danh sách con để bắt đầu!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxHeight: 300, overflowY: "auto" }}>
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="glass"
                      onClick={() => setActiveReport(report)}
                      style={{
                        padding: "var(--space-2.5) var(--space-3)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>
                          Tuần {report.content?.period?.split(" → ")[1] || ""}
                        </div>
                        <div style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)" }}>
                          {report.content?.childName} · L{report.content?.currentLevel}
                        </div>
                      </div>
                      <Sparkles size={14} style={{ color: "var(--warning)" }} />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
