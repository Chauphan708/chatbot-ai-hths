/**
 * API Key Settings — Teacher can manage their Gemini API key
 */

import { useState, useEffect, useCallback } from "react";
import { Key, Eye, EyeOff, ExternalLink, Trash2, Save } from "lucide-react";
import { GlassCard, Button, Spinner, showToast } from "../ui";
import { teacherApi } from "../../services/teacherApi";

export function ApiKeySettings() {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await teacherApi.getApiKeyStatus();
      setHasKey(res.data?.hasKey ?? false);
    } catch {
      // Silently handle — key not set
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      showToast("Vui lòng nhập API key", "warning");
      return;
    }

    setSaving(true);
    try {
      await teacherApi.updateApiKey(trimmed);
      setHasKey(true);
      setApiKey("");
      setShowKey(false);
      showToast("Đã lưu API key thành công!", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Lỗi khi lưu API key",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa API key?")) return;

    setDeleting(true);
    try {
      await teacherApi.deleteApiKey();
      setHasKey(false);
      setApiKey("");
      showToast("Đã xóa API key", "info");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Lỗi khi xóa API key",
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <GlassCard padding="md">
        <div className="flex items-center justify-center" style={{ padding: "var(--space-4)" }}>
          <Spinner size="sm" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard padding="md" className="api-key-settings">
      {/* Header */}
      <div className="flex items-center gap-3" style={{ marginBottom: "var(--space-4)" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), hsl(160, 70%, 40%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          <Key size={20} />
        </div>
        <div>
          <h3 style={{ fontWeight: 600, fontSize: "var(--text-base)" }}>
            Gemini API Key
          </h3>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Dùng API key riêng để chatbot hoạt động
          </p>
        </div>
      </div>

      {/* Status */}
      {hasKey && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.25)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
            fontSize: "var(--text-sm)",
            color: "var(--success)",
          }}
        >
          <span>✅</span>
          <span>Đã cấu hình — <code style={{ opacity: 0.7 }}>AIza****xxxx</code></span>
        </div>
      )}

      {/* Input */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <label
          htmlFor="api-key-input"
          style={{
            display: "block",
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            marginBottom: "var(--space-2)",
          }}
        >
          {hasKey ? "Cập nhật API key mới" : "Nhập Gemini API key"}
        </label>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-2) var(--space-3)",
            transition: "border-color var(--transition-fast)",
          }}
        >
          <Key size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            id="api-key-input"
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              outline: "none",
              padding: "var(--space-1) 0",
            }}
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "var(--space-1)",
              display: "flex",
              flexShrink: 0,
            }}
            title={showKey ? "Ẩn key" : "Hiện key"}
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        <Button
          size="sm"
          icon={<Save size={16} />}
          onClick={handleSave}
          loading={saving}
          disabled={!apiKey.trim()}
        >
          {hasKey ? "Cập nhật" : "Lưu key"}
        </Button>

        {hasKey && (
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={handleDelete}
            loading={deleting}
          >
            Xóa key
          </Button>
        )}
      </div>

      {/* Help link */}
      <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--glass-border)" }}>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: "var(--text-xs)",
            color: "var(--primary)",
          }}
        >
          <ExternalLink size={12} />
          Lấy API key từ Google AI Studio
        </a>
      </div>
    </GlassCard>
  );
}
