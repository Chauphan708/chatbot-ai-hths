import { useEffect, useState } from "react";
import { Users, BookOpen, MessageSquare, ShieldCheck, Check, X, Eye } from "lucide-react";
import { GlassCard, Button, Badge, Spinner, showToast } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { adminApi, type Stats, type Teacher, type Conversation } from "../../services/adminApi";
import { Link } from "react-router-dom";

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, teachersRes, convRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getTeachers(),
        adminApi.getConversations()
      ]);

      if (statsRes.data) setStats(statsRes.data);
      setTeachers(teachersRes.data || []);
      setConversations(convRes.data || []);
    } catch (err) {
      showToast("Lỗi khi tải dữ liệu admin", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, currentStatus: boolean) => {
    try {
      await adminApi.verifyTeacher(id, !currentStatus);
      showToast(currentStatus ? "Đã hủy phê duyệt" : "Đã phê duyệt giáo viên", "success");
      loadData();
    } catch (err) {
      showToast("Lỗi khi thực hiện phê duyệt", "error");
    }
  };

  if (loading) return <DashboardLayout role="admin"><div className="flex justify-center py-20"><Spinner size="lg" /></div></DashboardLayout>;

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <h1 className="page-header__title">🛡️ Admin Control Center</h1>
        <p className="page-header__subtitle">Quản trị toàn bộ hệ thống GócHọc AI</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<Users className="text-primary" />} 
          label="Người dùng" 
          value={stats?.totalUsers || 0} 
        />
        <StatCard 
          icon={<ShieldCheck className="text-success" />} 
          label="Giáo viên" 
          value={stats?.totalTeachers || 0} 
        />
        <StatCard 
          icon={<BookOpen className="text-info" />} 
          label="Lớp học" 
          value={stats?.totalClasses || 0} 
        />
        <StatCard 
          icon={<MessageSquare className="text-warning" />} 
          label="Hội thoại" 
          value={stats?.totalConversations || 0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teacher Management Table */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck size={20} /> Phê duyệt Giáo viên
          </h2>
          <GlassCard padding="sm" className="overflow-hidden" style={{ padding: 0 }}>
            <table className="w-full text-left">
              <thead className="bg-glass-white/5 border-b border-glass-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold">Tên / Email</th>
                  <th className="px-4 py-3 text-xs font-semibold text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-xs font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {teachers.slice(0, 10).map(t => (
                  <tr key={t.id} className="border-b border-glass-border last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs text-secondary">{t.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={t.isVerified ? "success" : "warning"}>
                        {t.isVerified ? "Đã duyệt" : "Chờ duyệt"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button 
                        size="sm" 
                        variant={t.isVerified ? "ghost" : "primary"}
                        icon={t.isVerified ? <X size={14} /> : <Check size={14} />}
                        onClick={() => handleVerify(t.id, t.isVerified)}
                      >
                        {t.isVerified ? "Hủy" : "Duyệt"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>

        {/* Conversation Logs */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare size={20} /> Hội thoại mới nhất
          </h2>
          <GlassCard padding="sm" className="overflow-hidden" style={{ padding: 0 }}>
            <table className="w-full text-left">
              <thead className="bg-glass-white/5 border-b border-glass-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold">Người dùng</th>
                  <th className="px-4 py-3 text-xs font-semibold">Bot / Lớp</th>
                  <th className="px-4 py-3 text-xs font-semibold text-right">Xem</th>
                </tr>
              </thead>
              <tbody>
                {conversations.slice(0, 10).map(c => (
                  <tr key={c.id} className="border-b border-glass-border last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{c.user?.name}</div>
                      <div className="text-xs text-secondary">{c.user?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{c.chatbot?.name}</div>
                      <div className="text-xs text-secondary">{c.chatbot?.class?.name || "N/A"}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/conversations/${c.id}`}>
                        <Button size="sm" variant="ghost" icon={<Eye size={14} />} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <GlassCard padding="md" className="flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="text-xs text-secondary font-medium uppercase tracking-wider">{label}</div>
      </div>
    </GlassCard>
  );
}
