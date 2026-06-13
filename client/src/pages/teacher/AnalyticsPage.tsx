/**
 * Analytics Page — Charts + Insights + Leaderboard
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Users, AlertTriangle, Trophy, Download, MessageSquare } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { GlassCard, Button, Spinner } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { StudentInsightsList, ChatLogViewer, LeaderboardTable } from "../../components/analytics";
import { teacherApi } from "../../services/teacherApi";
import { exportConversationsToExcel } from "../../utils/exportUtils";
import type { AnalyticsData, ChatSession } from "../../types";

const PIE_COLORS = ["hsl(230,80%,62%)", "hsl(280,65%,60%)", "hsl(160,70%,50%)", "hsl(40,95%,55%)"];

export function AnalyticsPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [classStats, setClassStats] = useState<{ uniqueStudents: number; totalMessages: number; totalSessions: number; averageXp: number } | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<Array<{ studentId: string; studentName: string; studentEmail: string; topic: string; errorCount: number; lastOccurred: string }>>([]);
  const [errorTrends, setErrorTrends] = useState<Array<{ topic: string; errorType: string | null; totalErrors: number; studentCount: number }>>([]);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!botId) return;
    const load = async () => {
      try {
        const [statsRes, atRiskRes, trendsRes, chatRes, analyticsRes] = await Promise.all([
          teacherApi.getClassStats(botId),
          teacherApi.getAtRiskStudents(botId),
          teacherApi.getErrorTrends(botId, 30),
          teacherApi.getChatHistory(botId),
          teacherApi.getAnalytics(botId),
        ]);
        setClassStats(statsRes.data || null);
        setAtRiskStudents(atRiskRes.data || []);
        setErrorTrends(trendsRes.data || []);
        setChatHistory(chatRes.data || []);
        setAnalytics(analyticsRes.data || null);
      } catch (err) {
        console.error("Failed to load analytics data:", err);
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

  // Real chart data from error trends
  const barData = errorTrends.slice(0, 7).map((trend) => ({
    name: trend.topic.length > 15 ? trend.topic.slice(0, 15) + "..." : trend.topic,
    "Lỗi sai": trend.totalErrors,
    "Học sinh": trend.studentCount,
  }));

  const pieData = [
    { name: "Tổng lượt chat", value: classStats?.totalSessions || 0 },
    { name: "Tin nhắn trung bình", value: classStats?.totalMessages ? Math.round(classStats.totalMessages / (classStats.totalSessions || 1)) : 0 },
  ];

  // Map at-risk students to insights list schema
  const needSupportInsights = atRiskStudents.map((s) => ({
    id: `${s.studentId}-${s.topic}`,
    chatbotId: botId || "",
    studentId: s.studentId,
    topic: s.topic,
    errorType: "Có nguy cơ hổng kiến thức",
    errorCount: s.errorCount,
    needsSupport: true,
    student: { name: s.studentName, email: s.studentEmail },
  }));

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/teacher/bots/${botId}`)} icon={<ArrowLeft size={16} />}>
          Quay lại
        </Button>
        <h1 className="page-header__title" style={{ marginTop: "var(--space-4)" }}>
          📊 Phân Tích Lớp Học
        </h1>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "var(--space-6)" }}>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--primary"><Users size={24} /></div>
            <div>
              <div className="stat-value">{classStats?.uniqueStudents || 0}</div>
              <div className="stat-label">Học sinh tham gia</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--accent"><BarChart3 size={24} /></div>
            <div>
              <div className="stat-value">{classStats?.totalSessions || 0}</div>
              <div className="stat-label">Tổng phiên học</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--secondary"><MessageSquare size={24} /></div>
            <div>
              <div className="stat-value">{classStats?.totalMessages || 0}</div>
              <div className="stat-label">Tin nhắn tương tác</div>
            </div>
          </div>
        </GlassCard>
        <GlassCard padding="md">
          <div className="flex items-center gap-4">
            <div className="stat-icon stat-icon--success"><Trophy size={24} /></div>
            <div>
              <div className="stat-value">{Math.round(classStats?.averageXp || 0)}</div>
              <div className="stat-label">XP trung bình</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <GlassCard padding="md">
          <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)" }}>📉 Top chủ đề hay mắc lỗi nhất (30 ngày qua)</h3>
          {barData.length === 0 ? (
            <div className="flex items-center justify-center" style={{ height: 240, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
              Chưa phát hiện lỗi sai kiến thức nào từ học sinh 🎉
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "hsl(230,30%,16%)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }}
                  labelStyle={{ color: "white" }}
                />
                <Bar dataKey="Lỗi sai" fill="hsl(0,75%,60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Học sinh" fill="hsl(230,80%,62%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard padding="md">
          <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)" }}>📊 Phân bố tương tác</h3>
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
            <AlertTriangle size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--danger)" }} />
            Học sinh cần hỗ trợ khẩn cấp (Lỗi ≥3 lần)
          </h3>
          <StudentInsightsList insights={needSupportInsights} />
        </GlassCard>

        <GlassCard padding="md">
          <h3 style={{ fontWeight: 600, marginBottom: "var(--space-4)" }}>
            <Trophy size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--warning)" }} />
            Bảng xếp hạng lớp học
          </h3>
          <LeaderboardTable entries={analytics?.leaderboard || []} />
        </GlassCard>
      </div>

      {/* Chat Log */}
      <GlassCard padding="md" style={{ marginTop: "var(--space-6)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontWeight: 600 }}>
            💬 Lịch sử chat gần đây
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<Download size={16} />}
            onClick={() => exportConversationsToExcel(chatHistory, `bao-cao-chat-${botId}`)}
          >
            Xuất Excel
          </Button>
        </div>
        <ChatLogViewer sessions={chatHistory} />
      </GlassCard>
    </DashboardLayout>
  );
}
