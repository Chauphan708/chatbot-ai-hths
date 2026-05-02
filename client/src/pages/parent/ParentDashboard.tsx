/**
 * Parent Dashboard — Overview
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, History } from "lucide-react";
import { GlassCard, Button, Spinner } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { parentApi } from "../../services/parentApi";
import type { ChildInfo } from "../../types";

export function ParentDashboard() {
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await parentApi.listChildren();
        setChildren(res.data || []);
      } catch (err) {
        console.error("Failed to load children:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout role="parent">
      <div className="page-header">
        <h1 className="page-header__title">👨‍👩‍👧 Phụ Huynh</h1>
        <p className="page-header__subtitle">
          Quản lý tài khoản con và theo dõi học tập
        </p>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 600 }}>
          Con em ({children.length})
        </h2>
        <Button icon={<Plus size={18} />} onClick={() => navigate("/parent/children/add")}>
          Thêm con
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center" style={{ padding: "var(--space-12)" }}>
          <Spinner size="lg" />
        </div>
      ) : children.length === 0 ? (
        <GlassCard padding="lg" className="text-center">
          <Users size={48} style={{ margin: "0 auto var(--space-4)", opacity: 0.3 }} />
          <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
            Chưa có tài khoản con nào. Thêm con để bắt đầu!
          </p>
          <Button onClick={() => navigate("/parent/children/add")} icon={<Plus size={18} />}>
            Thêm con
          </Button>
        </GlassCard>
      ) : (
        <div className="bot-grid">
          {children.map((child) => (
            <GlassCard key={child.id} padding="md" hover>
              <div className="flex items-center gap-4" style={{ marginBottom: "var(--space-3)" }}>
                <div className="sidebar__avatar">
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 600 }}>{child.name}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                    {child.email}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                icon={<History size={16} />}
                onClick={() => navigate(`/parent/children/${child.id}/history`)}
              >
                Xem lịch sử
              </Button>
            </GlassCard>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
