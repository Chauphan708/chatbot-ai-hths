import { useEffect, useState } from "react";
import { Plus, Users, CheckCircle, Clock, UserPlus, Edit2, Trash2 } from "lucide-react";
import { GlassCard, Button, Badge, Spinner, Input, showToast } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { classApi } from "../../services/classApi";

interface ClassRoom {
  id: string;
  name: string;
  academicYear: string;
  description: string;
}

interface Member {
  id: string;
  userId: string;
  isVerified: boolean;
  role: string;
  user: {
    name: string;
    email: string;
  };
}

export function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Form states
  const [className, setClassName] = useState("");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("12345678");
  const [newUserRole, setNewUserRole] = useState<"parent" | "student">("student");

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const res = await classApi.listClasses();
      setClasses(res.data || []);
      if (res.data && res.data.length > 0 && !selectedClass) {
        setSelectedClass(res.data[0]);
        loadMembers(res.data[0].id);
      }
    } catch (err) {
      showToast("Lỗi khi tải danh sách lớp", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (classId: string) => {
    try {
      setLoadingMembers(true);
      const res = await classApi.listMembers(classId);
      setMembers(res.data || []);
    } catch (err) {
      showToast("Lỗi khi tải danh sách thành viên", "error");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateClass = async () => {
    if (!className) return showToast("Vui lòng nhập tên lớp", "error");
    try {
      await classApi.createClass({ name: className, academicYear });
      showToast("Tạo lớp thành công", "success");
      setShowCreateClass(false);
      setClassName("");
      loadClasses();
    } catch (err) {
      showToast("Lỗi khi tạo lớp", "error");
    }
  };

  const handleEditClass = async () => {
    if (!selectedClass) return;
    if (!className) return showToast("Vui lòng nhập tên lớp", "error");
    try {
      await classApi.updateClass(selectedClass.id, { name: className, academicYear });
      showToast("Cập nhật lớp thành công", "success");
      setShowEditClass(false);
      loadClasses();
    } catch (err) {
      showToast("Lỗi khi cập nhật lớp", "error");
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lớp học này? Tất cả thành viên sẽ bị xóa khỏi lớp.")) return;
    try {
      await classApi.deleteClass(id);
      showToast("Đã xóa lớp học", "success");
      if (selectedClass?.id === id) setSelectedClass(null);
      loadClasses();
    } catch (err) {
      showToast("Lỗi khi xóa lớp học", "error");
    }
  };

  const handleVerify = async (userId: string, isVerified: boolean) => {
    if (!selectedClass) return;
    try {
      await classApi.verifyMember(selectedClass.id, userId, isVerified);
      showToast(isVerified ? "Đã xác minh" : "Đã hủy xác minh", "success");
      loadMembers(selectedClass.id);
    } catch (err) {
      showToast("Lỗi khi thực hiện", "error");
    }
  };

  const handleCreateUser = async () => {
    if (!selectedClass) return;
    if (!newUserName || !newUserEmail) return showToast("Vui lòng nhập đủ thông tin", "error");
    try {
      await classApi.teacherCreateUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole,
        classId: selectedClass.id
      });
      showToast(`Đã tạo tài khoản cho ${newUserRole === 'parent' ? 'Phụ huynh' : 'Học sinh'}`, "success");
      setShowCreateUser(false);
      setNewUserName("");
      setNewUserEmail("");
      loadMembers(selectedClass.id);
    } catch (err) {
      showToast("Lỗi khi tạo tài khoản", "error");
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <h1 className="page-header__title">🏫 Quản Lý Lớp Học</h1>
        <p className="page-header__subtitle">
          Quản lý năm học, phê duyệt phụ huynh và học sinh
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Class List */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Danh sách lớp</h2>
            <Button 
              size="sm" 
              icon={<Plus size={16} />}
              onClick={() => setShowCreateClass(!showCreateClass)}
            >
              Lớp mới
            </Button>
          </div>

          {showCreateClass && (
            <GlassCard padding="md" className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm">Tạo lớp mới</h3>
              <Input 
                placeholder="Tên lớp (VD: Lớp 4A)" 
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
              <Input 
                placeholder="Năm học (VD: 2024-2025)" 
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" fullWidth onClick={handleCreateClass}>Lưu</Button>
                <Button size="sm" fullWidth variant="ghost" onClick={() => setShowCreateClass(false)}>Hủy</Button>
              </div>
            </GlassCard>
          )}

          {showEditClass && (
            <GlassCard padding="md" className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm">Chỉnh sửa lớp</h3>
              <Input 
                placeholder="Tên lớp" 
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
              <Input 
                placeholder="Năm học" 
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" fullWidth onClick={handleEditClass}>Cập nhật</Button>
                <Button size="sm" fullWidth variant="ghost" onClick={() => setShowEditClass(false)}>Hủy</Button>
              </div>
            </GlassCard>
          )}

          {loading ? <Spinner size="md" className="mx-auto my-8" /> : (
            <div className="flex flex-col gap-2">
              {classes.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedClass(c);
                    loadMembers(c.id);
                  }}
                  className="cursor-pointer"
                >
                  <GlassCard 
                    padding="sm" 
                    hover 
                    className={`transition-all ${selectedClass?.id === c.id ? 'border-primary' : ''}`}
                  >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-secondary">{c.academicYear}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          icon={<Edit2 size={12} />} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setClassName(c.name);
                            setAcademicYear(c.academicYear);
                            setSelectedClass(c);
                            setShowEditClass(true);
                            setShowCreateClass(false);
                          }}
                        />
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-error hover:bg-error/10"
                          icon={<Trash2 size={12} />} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClass(c.id);
                          }}
                        />
                      </div>
                      <Users size={16} className="text-secondary opacity-50" />
                    </div>
                  </div>
                  </GlassCard>
                </div>
              ))}
              {classes.length === 0 && !showCreateClass && (
                <p className="text-center text-secondary py-8">Chưa có lớp nào</p>
              )}
            </div>
          )}
        </div>

        {/* Right: Members Table */}
        <div className="w-full lg:w-2/3">
          {selectedClass ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedClass.name}</h2>
                  <p className="text-secondary text-sm">Năm học: {selectedClass.academicYear}</p>
                </div>
                <Button 
                  variant="primary" 
                  icon={<UserPlus size={18} />}
                  onClick={() => setShowCreateUser(true)}
                >
                  Tạo tài khoản
                </Button>
              </div>

              {/* Members Table */}
              <GlassCard padding="sm" className="overflow-hidden" style={{ padding: 0 }}>
                <table className="w-full text-left">
                  <thead className="bg-glass-white/5 border-b border-glass-border">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold">Tên</th>
                      <th className="px-4 py-3 text-sm font-semibold">Email</th>
                      <th className="px-4 py-3 text-sm font-semibold">Vai trò</th>
                      <th className="px-4 py-3 text-sm font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 text-sm font-semibold">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMembers ? (
                      <tr>
                        <td colSpan={5} className="py-12"><Spinner size="md" className="mx-auto" /></td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-secondary">Lớp chưa có thành viên</td>
                      </tr>
                    ) : members.map(m => (
                      <tr key={m.id} className="border-b border-glass-border last:border-0">
                        <td className="px-4 py-4">{m.user.name}</td>
                        <td className="px-4 py-4 text-secondary text-sm">{m.user.email}</td>
                        <td className="px-4 py-4">
                          <Badge variant={m.role === 'parent' ? 'info' : 'default'}>
                            {m.role === 'parent' ? 'Phụ huynh' : 'Học sinh'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          {m.isVerified ? (
                            <div className="flex items-center gap-1 text-success text-sm">
                              <CheckCircle size={14} /> Đã duyệt
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-warning text-sm">
                              <Clock size={14} /> Chờ duyệt
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {m.isVerified ? (
                            <Button size="sm" variant="ghost" onClick={() => handleVerify(m.userId, false)}>
                              Hủy duyệt
                            </Button>
                          ) : (
                            <Button size="sm" variant="primary" onClick={() => handleVerify(m.userId, true)}>
                              Duyệt ngay
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </div>
          ) : (
            <GlassCard padding="lg" className="flex flex-col items-center justify-center py-20 opacity-50">
               <Users size={64} className="mb-4" />
               <p>Vui lòng chọn hoặc tạo lớp học để quản lý</p>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Modal: Create User */}
      {showCreateUser && (
        <div className="modal-overlay">
          <GlassCard padding="lg" className="w-full max-w-md">
            <h2 className="text-xl font-bold mb-6">Tạo tài khoản cho {selectedClass?.name}</h2>
            <div className="flex flex-col gap-4">
              <Input 
                label="Họ và tên"
                placeholder="Nguyễn Văn A" 
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
              <Input 
                label="Email"
                type="email"
                placeholder="user@example.com" 
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
              <Input 
                label="Mật khẩu mặc định"
                placeholder="12345678" 
                value={newUserPass}
                onChange={(e) => setNewUserPass(e.target.value)}
              />
              <div>
                <label className="block text-sm mb-1 opacity-70">Vai trò</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="role" 
                      checked={newUserRole === 'student'} 
                      onChange={() => setNewUserRole('student')} 
                    /> Học sinh
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="role" 
                      checked={newUserRole === 'parent'} 
                      onChange={() => setNewUserRole('parent')} 
                    /> Phụ huynh
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button fullWidth onClick={handleCreateUser}>Tạo tài khoản</Button>
                <Button fullWidth variant="ghost" onClick={() => setShowCreateUser(false)}>Hủy</Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </DashboardLayout>
  );
}
