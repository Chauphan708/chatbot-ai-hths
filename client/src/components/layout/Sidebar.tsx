/**
 * Sidebar — Navigation sidebar for Teacher/Parent dashboards
 */

import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Bot,
  LayoutDashboard,
  Database,
  BarChart3,
  Users,
  History,
  LogOut,
  ChevronLeft,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../types";
import "./layout.css";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const teacherNav: NavItem[] = [
  { label: "Tổng quan", path: "/teacher", icon: LayoutDashboard },
  { label: "Lớp học", path: "/teacher/classes", icon: Users },
  { label: "Chatbots", path: "/teacher/bots", icon: Bot },
  { label: "Dữ liệu", path: "/teacher/training", icon: Database },
  { label: "Phân tích", path: "/teacher/analytics", icon: BarChart3 },
];

const parentNav: NavItem[] = [
  { label: "Tổng quan", path: "/parent", icon: LayoutDashboard },
  { label: "Con em", path: "/parent/children", icon: Users },
  { label: "Lịch sử", path: "/parent/history", icon: History },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true); // Default to our premium dark theme

  useEffect(() => {
    // Check saved preference
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.add("light-theme");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const newDark = !prev;
      if (newDark) {
        document.documentElement.classList.remove("light-theme");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.add("light-theme");
        localStorage.setItem("theme", "light");
      }
      return newDark;
    });
  };

  const navItems: NavItem[] =
    user?.role === "teacher" ? teacherNav : parentNav;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <Bot size={28} />
          {!collapsed && <span>AI Chatbot</span>}
        </div>
        {onToggle && (
          <button className="sidebar__toggle" onClick={onToggle} aria-label="Thu gọn">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/teacher" || item.path === "/parent"}
            className={({ isActive }: { isActive: boolean }) =>
              `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={20} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <button
          className="sidebar__link sidebar__theme-toggle"
          onClick={toggleTheme}
          title={collapsed ? (isDark ? "Giao diện sáng" : "Giao diện tối") : undefined}
          style={{ justifyContent: collapsed ? "center" : "flex-start", marginBottom: "var(--space-2)" }}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && <span>{isDark ? "Giao diện sáng" : "Giao diện tối"}</span>}
        </button>

        {!collapsed && user && (
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user.name}</span>
              <span className="sidebar__user-role">
                {user.role === "teacher" ? "Giáo viên" : "Phụ huynh"}
              </span>
            </div>
          </div>
        )}
        <button className="sidebar__link sidebar__logout" onClick={handleLogout} style={{ justifyContent: collapsed ? "center" : "flex-start" }}>
          <LogOut size={20} />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Dashboard Layout ─────────────────────────────────

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-layout__main">{children}</main>
    </div>
  );
}
