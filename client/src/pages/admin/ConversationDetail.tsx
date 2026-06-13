import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, User } from "lucide-react";
import { GlassCard, Button, Spinner, showToast } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { adminApi } from "../../services/adminApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadDetail(id);
  }, [id]);

  const loadDetail = async (sessionId: string) => {
    try {
      setLoading(true);
      const res = await adminApi.getConversationDetail(sessionId);
      setSession(res.data);
    } catch (err) {
      showToast("Lỗi khi tải chi tiết hội thoại", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout role="admin"><div className="flex justify-center py-20"><Spinner size="lg" /></div></DashboardLayout>;
  if (!session) return <DashboardLayout role="admin"><div className="text-center py-20">Không tìm thấy hội thoại</div></DashboardLayout>;

  return (
    <DashboardLayout role="admin">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Quay lại
        </Button>
        <div>
          <h1 className="text-xl font-bold">Hội thoại: {session.user?.name}</h1>
          <p className="text-sm text-secondary">Học sinh: {session.user?.email} | Bot: {session.chatbot?.name}</p>
        </div>
      </div>

      <GlassCard padding="lg" className="flex flex-col gap-6 max-w-4xl mx-auto">
        <div className="flex flex-col gap-6">
          {session.messages?.map((msg: any) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'student' ? 'flex-row' : 'flex-row-reverse'}`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border ${
                msg.role === 'student' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-success/10 border-success/20 text-success'
              }`}>
                {msg.role === 'student' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`flex-1 p-4 rounded-2xl border ${
                msg.role === 'student' ? 'bg-white/5 border-white/10 rounded-tl-none' : 'bg-success/5 border-success/10 rounded-tr-none'
              }`}>
                <div className="text-xs font-bold mb-1 opacity-50 uppercase">
                  {msg.role === 'student' ? session.user?.name : session.chatbot?.name}
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                <div className="text-[10px] opacity-30 mt-2 text-right">
                  {new Date(msg.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}

          {session.messages?.length === 0 && (
            <div className="text-center py-10 opacity-30 italic">Chưa có tin nhắn nào</div>
          )}
        </div>
      </GlassCard>
    </DashboardLayout>
  );
}
