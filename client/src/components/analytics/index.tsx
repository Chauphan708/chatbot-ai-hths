/**
 * Analytics Components — StatsCards, ChatLogViewer, StudentInsights, LeaderboardTable
 */

import { type ReactNode } from "react";
import { AlertTriangle, MessageSquare, Trophy } from "lucide-react";
import { GlassCard, Badge } from "../ui";
import type { StudentInsight, ChatSession } from "../../types";

// ─── Student Insights Cards ──────────────────────────

interface StudentInsightsProps {
  insights: StudentInsight[];
}

export function StudentInsightsList({ insights }: StudentInsightsProps) {
  const needSupport = insights.filter((i) => i.needsSupport);

  if (needSupport.length === 0) {
    return (
      <div className="text-center" style={{ padding: "var(--space-6)", color: "var(--text-muted)" }}>
        <p>Không có học sinh nào cần hỗ trợ đặc biệt 🎉</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {needSupport.map((insight) => (
        <GlassCard key={insight.id} padding="sm">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "hsla(0,75%,60%,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} style={{ color: "var(--danger)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                {insight.student?.displayName || "Học sinh"}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                {insight.topic} · {insight.errorType || "Cần hỗ trợ"}
              </div>
            </div>
            <Badge variant="danger">Lỗi ×{insight.errorCount}</Badge>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ─── Chat Log Viewer ──────────────────────────────────

interface ChatLogViewerProps {
  sessions: ChatSession[];
  onViewSession?: (sessionId: string) => void;
}

export function ChatLogViewer({ sessions, onViewSession }: ChatLogViewerProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center" style={{ padding: "var(--space-6)", color: "var(--text-muted)" }}>
        <MessageSquare size={32} style={{ margin: "0 auto var(--space-3)", opacity: 0.3 }} />
        <p>Chưa có phiên chat nào</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" style={{ maxHeight: 400, overflowY: "auto" }}>
      {sessions.map((session) => (
        <div
          key={session.id}
          className="glass"
          style={{
            padding: "var(--space-3) var(--space-4)",
            cursor: onViewSession ? "pointer" : "default",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
          onClick={() => onViewSession?.(session.id)}
        >
          <div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
              {new Date(session.startedAt).toLocaleString("vi-VN")}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {session.messagesCount} tin · +{session.xpEarned} XP
            </div>
          </div>
          {session.activeHat && <Badge variant="info">🎩 {session.activeHat}</Badge>}
        </div>
      ))}
    </div>
  );
}

// ─── Leaderboard Table ────────────────────────────────

interface LeaderboardEntry {
  studentId: string;
  displayName: string;
  totalXp: number;
  level: number;
  streakDays: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps): ReactNode {
  if (entries.length === 0) {
    return (
      <div className="text-center" style={{ padding: "var(--space-6)", color: "var(--text-muted)" }}>
        <Trophy size={32} style={{ margin: "0 auto var(--space-3)", opacity: 0.3 }} />
        <p>Chưa có dữ liệu bảng xếp hạng</p>
      </div>
    );
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
            <th style={{ padding: "var(--space-3)", textAlign: "left", color: "var(--text-muted)", fontWeight: 500 }}>#</th>
            <th style={{ padding: "var(--space-3)", textAlign: "left", color: "var(--text-muted)", fontWeight: 500 }}>Học sinh</th>
            <th style={{ padding: "var(--space-3)", textAlign: "right", color: "var(--text-muted)", fontWeight: 500 }}>XP</th>
            <th style={{ padding: "var(--space-3)", textAlign: "right", color: "var(--text-muted)", fontWeight: 500 }}>Level</th>
            <th style={{ padding: "var(--space-3)", textAlign: "right", color: "var(--text-muted)", fontWeight: 500 }}>Streak</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={entry.studentId}
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <td style={{ padding: "var(--space-3)" }}>
                {i < 3 ? medals[i] : i + 1}
              </td>
              <td style={{ padding: "var(--space-3)", fontWeight: 500 }}>
                {entry.displayName}
              </td>
              <td style={{ padding: "var(--space-3)", textAlign: "right", color: "var(--warning)", fontWeight: 600 }}>
                {entry.totalXp.toLocaleString()}
              </td>
              <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                {entry.level}
              </td>
              <td style={{ padding: "var(--space-3)", textAlign: "right" }}>
                🔥 {entry.streakDays}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
