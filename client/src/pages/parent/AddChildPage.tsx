/**
 * Add Child Page — Parent creates account for child
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Mail, Lock, User } from "lucide-react";
import { GlassCard, Button, Input, showToast } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { parentApi } from "../../services/parentApi";

export function AddChildPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await parentApi.addChild(form);
      showToast("Đã tạo tài khoản con! 🎉", "success");
      navigate("/parent");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi tạo tài khoản", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="parent">
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate("/parent")} icon={<ArrowLeft size={16} />}>
          Quay lại
        </Button>
        <h1 className="page-header__title" style={{ marginTop: "var(--space-4)" }}>
          Thêm Tài Khoản Con
        </h1>
      </div>

      <GlassCard padding="lg" style={{ maxWidth: 480 }}>
        <form className="auth-card__form" onSubmit={handleSubmit}>
          <Input
            label="Họ tên con"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nguyễn Văn Bé"
            icon={<User size={18} />}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="con@example.com"
            icon={<Mail size={18} />}
            required
          />
          <Input
            label="Mật khẩu"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Tối thiểu 8 ký tự"
            icon={<Lock size={18} />}
            minLength={8}
            required
          />
          <Button type="submit" fullWidth size="lg" loading={loading} icon={<UserPlus size={18} />}>
            Tạo tài khoản
          </Button>
        </form>
      </GlassCard>
    </DashboardLayout>
  );
}
