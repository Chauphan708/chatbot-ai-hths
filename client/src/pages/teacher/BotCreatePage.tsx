/**
 * Bot Create Page — Form tạo chatbot mới
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { GlassCard, Button, Input, Textarea } from "../../components/ui";
import { DashboardLayout } from "../../components/layout/Sidebar";
import { teacherApi } from "../../services/teacherApi";
import { showToast } from "../../components/ui";

const subjects = ["Toán", "Tiếng Việt", "Khoa học", "Lịch sử", "Địa lý", "Tiếng Anh", "Khác"];
const grades = [1, 2, 3, 4, 5];

export function BotCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subject: "Toán",
    gradeLevel: 4,
    systemPrompt: "",
    botPersona: "",
    scaffoldingDefault: 1,
    enableSixHats: false,
    maxDailyChats: 10,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await teacherApi.createBot(form);
      showToast("Tạo chatbot thành công! 🎉", "success");
      navigate("/teacher");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi tạo bot", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="teacher">
      <div className="page-header">
        <Button variant="ghost" size="sm" onClick={() => navigate("/teacher")} icon={<ArrowLeft size={16} />}>
          Quay lại
        </Button>
        <h1 className="page-header__title" style={{ marginTop: "var(--space-4)" }}>
          Tạo Chatbot Mới
        </h1>
      </div>

      <GlassCard padding="lg" style={{ maxWidth: 640 }}>
        <form className="auth-card__form" onSubmit={handleSubmit}>
          <Input
            label="Tên chatbot"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Toán vui lớp 4"
            required
          />

          {/* Subject select */}
          <div className="input-group">
            <label className="input-group__label">Môn học</label>
            <select
              className="input-group__input"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Grade select */}
          <div className="input-group">
            <label className="input-group__label">Lớp</label>
            <select
              className="input-group__input"
              value={form.gradeLevel}
              onChange={(e) => setForm({ ...form, gradeLevel: Number(e.target.value) })}
            >
              {grades.map((g) => (
                <option key={g} value={g}>Lớp {g}</option>
              ))}
            </select>
          </div>

          <Textarea
            label="System Prompt (tùy chọn)"
            value={form.systemPrompt}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
            placeholder="Hướng dẫn đặc biệt cho AI..."
            rows={3}
          />

          <Textarea
            label="Persona chatbot (tùy chọn)"
            value={form.botPersona}
            onChange={(e) => setForm({ ...form, botPersona: e.target.value })}
            placeholder="VD: Anh Khoa - thầy giáo trẻ, vui tính, yêu toán..."
            rows={3}
          />

          {/* Scaffolding level */}
          <div className="input-group">
            <label className="input-group__label">
              Mức độ gợi ý mặc định (1-5)
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={form.scaffoldingDefault}
              onChange={(e) => setForm({ ...form, scaffoldingDefault: Number(e.target.value) })}
              className="input-group__input"
              style={{ padding: "4px" }}
            />
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
              Mức {form.scaffoldingDefault}: {["", "Gợi ý nhẹ", "Gợi ý vừa", "Hướng dẫn", "Chi tiết", "Giải thích đầy đủ"][form.scaffoldingDefault]}
            </span>
          </div>

          {/* Six Hats toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableSixHats"
              checked={form.enableSixHats}
              onChange={(e) => setForm({ ...form, enableSixHats: e.target.checked })}
            />
            <label htmlFor="enableSixHats" style={{ fontSize: "var(--text-sm)" }}>
              Bật chế độ 6 Mũ Tư Duy
            </label>
          </div>

          <Input
            label="Số lượt chat/ngày"
            type="number"
            value={String(form.maxDailyChats)}
            onChange={(e) => setForm({ ...form, maxDailyChats: Number(e.target.value) })}
            min={1}
            max={100}
          />

          <Button type="submit" fullWidth size="lg" loading={loading} icon={<Save size={18} />}>
            Tạo Chatbot
          </Button>
        </form>
      </GlassCard>
    </DashboardLayout>
  );
}
