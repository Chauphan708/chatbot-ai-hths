/**
 * Teacher Dashboard — Overview page
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Bot, Users, MessageSquare, TrendingUp } from "lucide-react";
import { GlassCard, Button, Badge, Spinner } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { teacherApi } from "../../services/teacherApi";
import type { Chatbot } from "../../types";

export function TeacherDashboard() {
  const [bots, setBots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await teacherApi.listBots();
        setBots(res.data || []);
      } catch (err) {
        console.error("Failed to load bots:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <h1 className="page-header__title">👩‍🏫 Bảng Điều Khiển</h1>
        <p className="page-header__subtitle">
          Quản lý chatbot và theo dõi học sinh
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--primary">
              <Bot size={24} />
            </div>
            <div>
              <div className="stat-value">{bots.length}</div>
              <div className="stat-label">Chatbot</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--accent">
              <Users size={24} />
            </div>
            <div>
              <div className="stat-value">—</div>
              <div className="stat-label">Học sinh</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--secondary">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="stat-value">—</div>
              <div className="stat-label">Tin nhắn</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--success">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="stat-value">—</div>
              <div className="stat-label">Phiên học</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Bot List */}
      <div style={{ marginTop: "var(--space-8)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
            Chatbot của bạn
          </h2>
          <Button
            icon={<Plus size={18} />}
            onClick={() => navigate("/teacher/bots/new")}
          >
            Tạo mới
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center" style={{ padding: "var(--space-12)" }}>
            <Spinner size="lg" />
          </div>
        ) : bots.length === 0 ? (
          <GlassCard padding="lg" className="text-center">
            <Bot size={48} style={{ margin: "0 auto var(--space-4)", opacity: 0.3 }} />
            <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
              Bạn chưa có chatbot nào. Tạo chatbot đầu tiên!
            </p>
            <Button onClick={() => navigate("/teacher/bots/new")} icon={<Plus size={18} />}>
              Tạo chatbot
            </Button>
          </GlassCard>
        ) : (
          <div className="bot-grid">
            {bots.map((bot) => (
              <GlassCard
                key={bot.id}
                padding="md"
                hover
                className="bot-card"
              >
                <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
                  <h3 style={{ fontWeight: 600 }}>{bot.name}</h3>
                  <Badge variant={bot.isActive ? "success" : "default"}>
                    {bot.isActive ? "Hoạt động" : "Tắt"}
                  </Badge>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
                  {bot.subject} · Lớp {bot.gradeLevel}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/teacher/bots/${bot.id}`)}
                  >
                    Chi tiết
                  </Button>
                  {bot.shareCode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/teacher/bots/${bot.id}/share`)}
                    >
                      Chia sẻ
                    </Button>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
