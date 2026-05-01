/**
 * Bot Detail Page — View/edit bot, manage training data, share
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Database, Plus, Trash2, Share2, RefreshCw,
} from "lucide-react";
import {
  GlassCard, Button, Input, Textarea, Badge, Spinner, Modal, showToast,
} from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { teacherApi } from "../../services/teacherApi";
import type { Chatbot, TrainingDataItem } from "../../types";

export function BotDetailPage() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<Chatbot | null>(null);
  const [trainingData, setTrainingData] = useState<TrainingDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddData, setShowAddData] = useState(false);
  const [newData, setNewData] = useState({ title: "", content: "" });
  const [addingData, setAddingData] = useState(false);

  useEffect(() => {
    if (!botId) return;
    const load = async () => {
      try {
        const [botRes, dataRes] = await Promise.all([
          teacherApi.getBot(botId),
          teacherApi.listTrainingData(botId),
        ]);
        setBot(botRes.data || null);
        setTrainingData(dataRes.data || []);
      } catch (err) {
        console.error(err);
        showToast("Không tìm thấy bot", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [botId]);

  const handleSave = async () => {
    if (!bot || !botId) return;
    setSaving(true);
    try {
      await teacherApi.updateBot(botId, {
        name: bot.name,
        systemPrompt: bot.systemPrompt || undefined,
        botPersona: bot.botPersona || undefined,
        scaffoldingDefault: bot.scaffoldingDefault,
        enableSixHats: bot.enableSixHats,
        maxDailyChats: bot.maxDailyChats,
      });
      showToast("Đã lưu thay đổi", "success");
    } catch {
      showToast("Lỗi lưu", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddData = async () => {
    if (!botId || !newData.title || !newData.content) return;
    setAddingData(true);
    try {
      const res = await teacherApi.addTrainingData(botId, newData);
      if (res.data) setTrainingData((prev) => [...prev, res.data!]);
      setNewData({ title: "", content: "" });
      setShowAddData(false);
      showToast("Đã thêm dữ liệu", "success");
    } catch {
      showToast("Lỗi thêm dữ liệu", "error");
    } finally {
      setAddingData(false);
    }
  };

  const handleDeleteData = async (dataId: string) => {
    if (!botId) return;
    try {
      await teacherApi.deleteTrainingData(botId, dataId);
      setTrainingData((prev) => prev.filter((d) => d.id !== dataId));
      showToast("Đã xóa", "info");
    } catch {
      showToast("Lỗi xóa", "error");
    }
  };

  const handleEmbedAll = async () => {
    if (!botId) return;
    try {
      await teacherApi.embedAll(botId);
      showToast("Đang tạo embedding...", "info");
    } catch {
      showToast("Lỗi embed", "error");
    }
  };

  const handleShare = async () => {
    if (!botId) return;
    try {
      const res = await teacherApi.getShareInfo(botId);
      const shareCode = res.data?.shareCode;
      if (shareCode) {
        const url = `${window.location.origin}/chat/${shareCode}`;
        await navigator.clipboard.writeText(url);
        showToast("Đã copy link chia sẻ! 📋", "success");
      }
    } catch {
      showToast("Lỗi lấy link", "error");
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="teacher">
        <div className="flex justify-center" style={{ padding: "var(--space-16)" }}>
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!bot) {
    return (
      <DashboardLayout role="teacher">
        <p>Không tìm thấy bot</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate("/teacher")} icon={<ArrowLeft size={16} />}>
          Quay lại
        </Button>
        <div className="flex items-center gap-4" style={{ marginTop: "var(--space-4)" }}>
          <h1 className="page-header__title">{bot.name}</h1>
          <Badge variant={bot.isActive ? "success" : "default"}>
            {bot.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="page-header__subtitle">{bot.subject} · Lớp {bot.gradeLevel}</p>
      </div>

      {/* Config Section */}
      <GlassCard padding="lg" style={{ marginBottom: "var(--space-6)", maxWidth: 640 }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: "var(--space-5)" }}>
          ⚙️ Cấu hình
        </h2>
        <div className="auth-card__form">
          <Input
            label="Tên bot"
            value={bot.name}
            onChange={(e) => setBot({ ...bot, name: e.target.value })}
          />
          <Textarea
            label="System Prompt"
            value={bot.systemPrompt || ""}
            onChange={(e) => setBot({ ...bot, systemPrompt: e.target.value })}
            rows={3}
          />
          <Textarea
            label="Persona"
            value={bot.botPersona || ""}
            onChange={(e) => setBot({ ...bot, botPersona: e.target.value })}
            rows={2}
          />
          <div className="flex gap-4">
            <Button onClick={handleSave} loading={saving} icon={<Save size={16} />}>
              Lưu
            </Button>
            <Button variant="secondary" onClick={handleShare} icon={<Share2 size={16} />}>
              Chia sẻ
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Training Data Section */}
      <GlassCard padding="lg" style={{ maxWidth: 640 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-5)" }}>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600 }}>
            <Database size={20} style={{ display: "inline", marginRight: 8, verticalAlign: "middle" }} />
            Dữ liệu huấn luyện ({trainingData.length})
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleEmbedAll} icon={<RefreshCw size={14} />}>
              Embed
            </Button>
            <Button size="sm" onClick={() => setShowAddData(true)} icon={<Plus size={14} />}>
              Thêm
            </Button>
          </div>
        </div>

        {trainingData.length === 0 ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "var(--space-6)" }}>
            Chưa có dữ liệu. Thêm nội dung bài học để AI có thể tham khảo!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {trainingData.map((item) => (
              <div
                key={item.id}
                className="glass"
                style={{ padding: "var(--space-3) var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <strong style={{ fontSize: "var(--text-sm)" }}>{item.title}</strong>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                    {item.content.slice(0, 80)}...
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteData(item.id)}
                  icon={<Trash2 size={14} />}
                />
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Add Data Modal */}
      <Modal isOpen={showAddData} onClose={() => setShowAddData(false)} title="Thêm dữ liệu huấn luyện">
        <div className="auth-card__form">
          <Input
            label="Tiêu đề"
            value={newData.title}
            onChange={(e) => setNewData({ ...newData, title: e.target.value })}
            placeholder="VD: Phân số - Cộng phân số khác mẫu"
          />
          <Textarea
            label="Nội dung"
            value={newData.content}
            onChange={(e) => setNewData({ ...newData, content: e.target.value })}
            placeholder="Nhập nội dung bài học, ví dụ, lời giải..."
            rows={6}
          />
          <Button onClick={handleAddData} loading={addingData} fullWidth icon={<Plus size={16} />}>
            Thêm dữ liệu
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
