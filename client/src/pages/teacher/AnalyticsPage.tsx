/**
 * Analytics Page — Charts + Insights + Leaderboard
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Users, AlertTriangle, Trophy } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { GlassCard, Button, Spinner } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { StudentInsightsList, ChatLogViewer, LeaderboardTable } from "../../components/analytics";
import { teacherApi } from "../../services/teacherApi";
import type { AnalyticsData, ChatSession } from "../../types";

const PIE_COLORS = ["hsl(230,80%,62%)", "hsl(280,65%,60%)", "hsl(160,70%,50%)", "hsl(40,95%,55%)"];

export function AnalyticsPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!botId) return;
    const load = async () => {
      try {
        const [aRes, cRes] = await Promise.all([
          teacherApi.getAnalytics(botId),
          teacherApi.getChatHistory(botId),
        ]);
        setAnalytics(aRes.data || null);
        setChatHistory(cRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [botId]);

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex justify-center" style={{ padding: "var(--space-16)" }}>
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  // Mock chart data from analytics
  const barData = [
    { name: "T2", chats: 12 },
    { name: "T3", chats: 19 },
    { name: "T4", chats: 8 },
    { name: "T5", chats: 25 },
    { name: "T6", chats: 15 },
    { name: "T7", chats: 5 },
    { name: "CN", chats: 3 },
  ];

  const pieData = [
    { name: "Hoàn thành", value: analytics?.totalSessions || 0 },
    { name: "Đang học", value: Math.max(0, (analytics?.totalStudents || 0) - (analytics?.totalSessions || 0)) },
  ];

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/teacher/bots/${botId}`)} icon={<ArrowLeft size={16} />}>
          Quay lại
        </Button>
        <h1 className="page-header__title" style={{ marginTop: "var(--space-4)" }}>
          📊 Phân Tích
        </h1>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "var(--space-6)" }}>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--primary"><Users size={24} /></div>
            <div>
              <div className="stat-value">{analytics?.totalStudents || 0}</div>
              <div className="stat-label">Học sinh</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--accent"><BarChart3 size={24} /></div>
            <div>
              <div className="stat-value">{analytics?.totalSessions || 0}</div>
              <div className="stat-label">Phiên học</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--secondary"><AlertTriangle size={24} /></div>
            <div>
              <div className="stat-value">{analytics?.insightsNeedingSupport?.length || 0}</div>
              <div className="stat-label">Cần hỗ trợ</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <GlassCard padding="md">
          <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)" }}>📈 Lượt chat theo tuần</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "hsl(230,30%,16%)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}
                labelStyle={{ color: "white" }}
              />
              <Bar dataKey="chats" fill="hsl(230,80%,62%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard padding="md">
          <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)" }}>📊 Tỷ lệ</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(230,30%,16%)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
        <GlassCard padding="md">
          <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)" }}>
            <AlertTriangle size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            Học sinh cần hỗ trợ
          </h3>
          <StudentInsightsList insights={analytics?.insightsNeedingSupport || []} />
        </GlassCard>

        <GlassCard padding="md">
          <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)" }}>
            <Trophy size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            Bảng xếp hạng
          </h3>
          <LeaderboardTable entries={analytics?.leaderboard || []} />
        </GlassCard>
      </div>

      {/* Chat Log */}
      <GlassCard padding="md" style={{ marginTop: "var(--space-6)" }}>
        <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)" }}>
          💬 Lịch sử chat gần đây
        </h3>
        <ChatLogViewer sessions={chatHistory} />
      </GlassCard>
    </DashboardLayout>
  );
}
