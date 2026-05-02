/**
 * Register Page
 */

import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Bot, Mail, Lock, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { GlassCard, Button, Input } from "../../components/ui";
import type { UserRole } from "../../types";
import "../../components/layout/layout.css";

const roles: { value: UserRole; label: string; emoji: string }[] = [
  { value: "teacher", label: "Giáo viên", emoji: "👩‍🏫" },
  { value: "parent", label: "Phụ huynh", emoji: "👨‍👩‍👧" },
];

export function RegisterPage() {
  const { register, isAuthenticated, isLoading, error, user, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && user && !isLoading) {
    const dashboardMap = { teacher: "/teacher", parent: "/parent", student: "/student" };
    return <Navigate to={dashboardMap[user.role]} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await register({ email, password, name, role });
      const dashboardMap = { teacher: "/teacher", parent: "/parent", student: "/student" };
      navigate(dashboardMap[role]);
    } catch {
      // Error handled by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <GlassCard padding="lg" className="auth-card" animate>
        <div className="auth-card__header">
          <div className="auth-card__icon">
            <Bot size={32} />
          </div>
          <h1 className="auth-card__title">Đăng Ký</h1>
          <p className="auth-card__subtitle">
            Tạo tài khoản miễn phí
          </p>
        </div>

        {error && <div className="auth-card__error">{error}</div>}

        <form className="auth-card__form" onSubmit={handleSubmit}>
          {/* Role selector */}
          <div>
            <label className="input-group__label">Bạn là</label>
            <div className="auth-card__role-selector">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`auth-card__role-btn ${role === r.value ? "auth-card__role-btn--active" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <span style={{ fontSize: "1.5rem" }}>{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Họ tên"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            icon={<User size={18} />}
            required
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            icon={<Mail size={18} />}
            required
          />

          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            icon={<Lock size={18} />}
            minLength={8}
            required
          />

          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Tạo tài khoản
          </Button>
        </form>

        <div className="auth-card__footer">
          Đã có tài khoản?{" "}
          <Link to="/login">Đăng nhập</Link>
          <div style={{ marginTop: '20px', fontSize: '0.7rem', opacity: 0.5, textAlign: 'center' }}>
            Debug: API={import.meta.env.VITE_API_URL || "http://localhost:3000"}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
