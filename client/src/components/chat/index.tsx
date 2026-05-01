/**
 * Chat Components — MessageBubble, TypingIndicator, ChatInput, HatIndicator
 */

import { useRef, useEffect, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { ChatMessage } from "../../types";
import "./chat.css";

// ─── MessageBubble ────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isStudent = message.role === "student";

  return (
    <div className={`message message--${message.role}`}>
      <div className="message__avatar">
        {isStudent ? "👧" : "🤖"}
      </div>
      <div className="message__bubble">
        {message.hatMode && (
          <div className="message__hat">
            🎩 {message.hatMode}
          </div>
        )}
        {isStudent ? (
          <p>{message.content}</p>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

// ─── TypingIndicator ──────────────────────────────────

export function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="message__avatar" style={{
        background: "linear-gradient(135deg, var(--primary), var(--secondary))",
        color: "white",
        width: 32,
        height: 32,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "var(--text-sm)",
      }}>
        🤖
      </div>
      <div className="typing-dots">
        <div className="typing-dots__dot" />
        <div className="typing-dots__dot" />
        <div className="typing-dots__dot" />
      </div>
    </div>
  );
}

// ─── ChatInput ────────────────────────────────────────

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  onToggleVoice?: () => void;
  isTTSActive?: boolean;
  onToggleTTS?: () => void;
  showVoice?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isRecording = false,
  onToggleVoice,
  isTTSActive = false,
  onToggleTTS,
  showVoice = true,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          rows={1}
          disabled={disabled}
        />
        <div className="chat-input-actions">
          {showVoice && onToggleTTS && (
            <button
              className={`chat-btn ${isTTSActive ? "" : "chat-btn--muted"}`}
              onClick={onToggleTTS}
              title={isTTSActive ? "Tắt đọc" : "Bật đọc"}
              type="button"
            >
              {isTTSActive ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          {showVoice && onToggleVoice && (
            <button
              className={`chat-btn ${isRecording ? "chat-btn--recording" : ""}`}
              onClick={onToggleVoice}
              title={isRecording ? "Dừng ghi" : "Nói"}
              type="button"
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          <button
            className="chat-btn chat-btn--send"
            onClick={onSend}
            disabled={!value.trim() || disabled}
            title="Gửi"
            type="button"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── HatSelector ──────────────────────────────────────

const hats = [
  { key: "white", label: "⬜ Trắng", desc: "Dữ liệu" },
  { key: "red", label: "🟥 Đỏ", desc: "Cảm xúc" },
  { key: "black", label: "⬛ Đen", desc: "Phản biện" },
  { key: "yellow", label: "🟨 Vàng", desc: "Lạc quan" },
  { key: "green", label: "🟩 Xanh lá", desc: "Sáng tạo" },
  { key: "blue", label: "🟦 Xanh dương", desc: "Tổng kết" },
];

interface HatSelectorProps {
  activeHat: string | null;
  onSelect: (hat: string | null) => void;
}

export function HatSelector({ activeHat, onSelect }: HatSelectorProps) {
  return (
    <div className="hat-selector">
      {hats.map((hat) => (
        <button
          key={hat.key}
          className={`hat-chip ${activeHat === hat.key ? "hat-chip--active" : ""}`}
          onClick={() => onSelect(activeHat === hat.key ? null : hat.key)}
          title={hat.desc}
          type="button"
        >
          {hat.label}
        </button>
      ))}
    </div>
  );
}

// ─── Usage Counter ────────────────────────────────────

interface UsageCounterProps {
  remaining: number;
  max: number;
}

export function UsageCounter({ remaining, max }: UsageCounterProps) {
  const className =
    remaining === 0
      ? "usage-counter usage-counter--empty"
      : remaining <= 3
        ? "usage-counter usage-counter--low"
        : "usage-counter";

  return (
    <div className={className}>
      {remaining === 0
        ? "Hết lượt chat hôm nay. Quay lại mai nhé! 🌙"
        : `Còn ${remaining}/${max} lượt hôm nay`}
    </div>
  );
}
