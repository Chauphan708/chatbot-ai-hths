import { useEffect, useState } from "react";
import { Users, BookOpen, MessageSquare, ShieldCheck, Check, X, Eye, Search, Download } from "lucide-react";
import { GlassCard, Button, Badge, Spinner, showToast } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { adminApi, type Stats, type Teacher, type Conversation } from "../../services/adminApi";
import { Link } from "react-router-dom";
import { exportConversationsToExcel, exportConversationsToPDF } from "../../utils/exportUtils";

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [teacherSearch, setTeacherSearch] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [teacherFilter, setTeacherFilter] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTeachers();
    }, 500);
    return () => clearTimeout(timer);
  }, [teacherSearch, teacherFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadConversations();
    }, 500);
    return () => clearTimeout(timer);
  }, [convSearch]);

  const loadStats = async () => {
    try {
      const res = await adminApi.getStats();
      if (res.data) setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await adminApi.getTeachers({ 
        search: teacherSearch, 
        verified: teacherFilter 
      });
      setTeachers(res.data || []);
    } catch (err) {
      showToast("Lỗi khi tải danh sách giáo viên", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await adminApi.getConversations({ search: convSearch });
      setConversations(res.data || []);
    } catch (err) {
      showToast("Lỗi khi tải lịch sử hội thoại", "error");
    }
  };

  const handleVerify = async (id: string, currentStatus: boolean) => {
    try {
      await adminApi.verifyTeacher(id, !currentStatus);
      showToast(currentStatus ? "Đã hủy phê duyệt" : "Đã phê duyệt giáo viên", "success");
      loadTeachers();
      loadStats();
    } catch (err) {
      showToast("Lỗi khi thực hiện phê duyệt", "error");
    }
  };

  const handleExportExcel = () => {
    if (conversations.length === 0) {
      showToast("Không có dữ liệu để xuất", "warning");
      return;
    }
    exportConversationsToExcel(conversations, "bao-cao-hoi-thoai-he-thong");
    showToast("Đã xuất file Excel thành công", "success");
  };

  const handleExportPDF = () => {
    if (conversations.length === 0) {
      showToast("Không có dữ liệu để xuất", "warning");
      return;
    }
    exportConversationsToPDF(conversations, "bao-cao-hoi-thoai", "BÁO CÁO HỘI THOẠI HỆ THỐNG");
    showToast("Đã xuất file PDF thành công", "success");
  };

  if (loading && teachers.length === 0) return <DashboardLayout role="admin"><div className="flex justify-center py-20"><Spinner size="lg" /></div></DashboardLayout>;

  return (
    <DashboardLayout role="admin">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header__title">🛡️ Admin Control Center</h1>
          <p className="page-header__subtitle">Quản trị toàn bộ hệ thống GócHọc AI</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<Download size={16} />} onClick={handleExportExcel}>Xuất Excel</Button>
          <Button variant="ghost" icon={<Download size={16} />} onClick={handleExportPDF}>Xuất PDF</Button>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" /> Phê duyệt Giáo viên
          </h2>
          <GlassCard padding="sm" className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                <input 
                  type="text"
                  placeholder="Tìm tên hoặc email..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                />
              </div>
              <select 
                className="bg-glass-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                value={teacherFilter === undefined ? "" : String(teacherFilter)}
                onChange={(e) => setTeacherFilter(e.target.value === "" ? undefined : e.target.value === "true")}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đã duyệt</option>
                <option value="false">Chờ duyệt</option>
              </select>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold text-secondary border-b border-white/10">
                    <th className="px-4 py-3">Giáo viên</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {teachers.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold">{t.name}</div>
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
            </div>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare size={20} className="text-warning" /> Nhật ký Hội thoại
          </h2>
          <GlassCard padding="sm" className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
              <input 
                type="text"
                placeholder="Tìm học sinh hoặc bot..."
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-semibold text-secondary border-b border-white/10">
                    <th className="px-4 py-3">Học sinh</th>
                    <th className="px-4 py-3">Bot / Lớp</th>
                    <th className="px-4 py-3 text-right">Xem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {conversations.map(c => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold">{c.user?.name}</div>
                        <div className="text-xs text-secondary">{c.user?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{c.chatbot?.name}</div>
                        <div className="text-xs text-secondary">{c.chatbot?.class?.name || "Cá nhân"}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/conversations/${c.id}`}>
                          <Button size="sm" variant="ghost" icon={<Eye size={16} />} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
