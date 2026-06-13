/**
 * Login Page
 */

import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Bot, Mail, Lock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { GlassCard, Button, Input } from "../../components/ui";
import "../../components/layout/layout.css";

export function LoginPage() {
  const { login, isAuthenticated, isLoading, error, user, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated && user && !isLoading) {
    const dashboardMap = { 
      teacher: "/teacher", 
      parent: "/parent", 
      student: "/student",
      admin: "/admin"
    };
    return <Navigate to={dashboardMap[user.role]} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate("/teacher"); // Will be redirected to correct dashboard by ProtectedRoute
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
          <h1 className="auth-card__title">Đăng Nhập</h1>
          <p className="auth-card__subtitle">
            AI Chatbot Hỗ Trợ Tự Học
          </p>
        </div>

        {error && <div className="auth-card__error">{error}</div>}

        <form className="auth-card__form" onSubmit={handleSubmit}>
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
            placeholder="••••••••"
            icon={<Lock size={18} />}
            required
          />

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={submitting}
          >
            Đăng nhập
          </Button>
        </form>

        <div className="auth-card__footer">
          Chưa có tài khoản?{" "}
          <Link to="/register">Đăng ký ngay</Link>
        </div>
      </GlassCard>
    </div>
  );
}
