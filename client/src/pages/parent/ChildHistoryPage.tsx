/**
 * Child History Page — Parent views child's chat sessions
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Clock, Star } from "lucide-react";
import { GlassCard, Button, Spinner, Badge, Modal } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { parentApi } from "../../services/parentApi";
import type { ChatSession, ChatMessage } from "../../types";

export function ChildHistoryPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!childId) return;
    const load = async () => {
      try {
        const res = await parentApi.getChildHistory(childId);
        setSessions(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId]);

  const viewMessages = async (sessionId: string) => {
    if (!childId) return;
    setSelectedSession(sessionId);
    setLoadingMessages(true);
    try {
      const res = await parentApi.getSessionMessages(childId, sessionId);
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <DashboardLayout role="parent">
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate("/parent")} icon={<ArrowLeft size={16} />}>
          Quay lại
        </Button>
        <h1 className="page-header__title" style={{ marginTop: "var(--space-4)" }}>
          📚 Lịch Sử Học Tập
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center" style={{ padding: "var(--space-12)" }}>
          <Spinner size="lg" />
        </div>
      ) : sessions.length === 0 ? (
        <GlassCard padding="lg" className="text-center">
          <MessageSquare size={48} style={{ margin: "0 auto var(--space-4)", opacity: 0.3 }} />
          <p style={{ color: "var(--text-secondary)" }}>Con chưa có phiên học nào.</p>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <GlassCard key={session.id} padding="md" hover>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-2)" }}>
                    <Clock size={14} style={{ color: "var(--text-muted)" }} />
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                      {new Date(session.startedAt).toLocaleString("vi-VN")}
                    </span>
                    <Badge variant="info">{session.messagesCount} tin</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star size={14} style={{ color: "var(--warning)" }} />
                    <span style={{ fontSize: "var(--text-sm)" }}>+{session.xpEarned} XP</span>
                    {session.activeHat && (
                      <Badge variant="warning">🎩 {session.activeHat}</Badge>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => viewMessages(session.id)}>
                  Xem chi tiết
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Message Detail Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Chi tiết phiên chat"
        size="lg"
      >
        {loadingMessages ? (
          <div className="flex justify-center" style={{ padding: "var(--space-6)" }}>
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-3" style={{ maxHeight: 400, overflowY: "auto" }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  background: msg.role === "student" ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.05)",
                  marginLeft: msg.role === "student" ? "auto" : 0,
                  marginRight: msg.role === "bot" ? "auto" : 0,
                  maxWidth: "80%",
                }}
              >
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>
                  {msg.role === "student" ? "👧 Học sinh" : "🤖 Bot"}
                </div>
                <p style={{ fontSize: "var(--text-sm)", lineHeight: 1.5 }}>{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
