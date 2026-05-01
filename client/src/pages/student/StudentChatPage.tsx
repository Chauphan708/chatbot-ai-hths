/**
 * Student Chat Page — Full chat interface
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Bot, Star } from "lucide-react";
import {
  MessageBubble,
  TypingIndicator,
  ChatInput,
  HatSelector,
  UsageCounter,
} from "../../components/chat";
import { GlassCard, Spinner, showToast } from "../../components/ui";
import { chatApi } from "../../services/chatApi";
import type { ChatMessage } from "../../types";

interface BotInfo {
  name: string;
  subject: string;
  gradeLevel: number;
  teacherName: string;
}

export function StudentChatPage() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(10);
  const [maxChats] = useState(10);
  const [activeHat, setActiveHat] = useState<string | null>(null);
  const [enableSixHats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isTTSActive, setIsTTSActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load bot info
  useEffect(() => {
    if (!shareCode) return;
    const load = async () => {
      try {
        const res = await chatApi.getBotInfo(shareCode);
        setBotInfo(res.data || null);
      } catch {
        showToast("Không tìm thấy chatbot", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [shareCode]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // TTS function
  const speak = useCallback(
    (text: string) => {
      if (!isTTSActive || !("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 0.9;
      // Try to find Vietnamese voice
      const voices = speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.startsWith("vi"));
      if (viVoice) utterance.voice = viVoice;
      speechSynthesis.speak(utterance);
    },
    [isTTSActive]
  );

  // Send message
  const handleSend = async () => {
    if (!shareCode || !inputValue.trim() || remaining <= 0) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: sessionId || "",
      role: "student",
      content: inputValue.trim(),
      isVoice: false,
      flagged: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const res = await chatApi.sendMessage(shareCode, {
        message: userMessage.content,
        sessionId: sessionId || undefined,
      });

      if (res.data) {
        const botMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          sessionId: res.data.sessionId,
          role: "bot",
          content: res.data.reply,
          hatMode: res.data.hatMode || null,
          scaffoldingAction: res.data.scaffoldingAction || null,
          isVoice: false,
          flagged: false,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, botMessage]);
        setSessionId(res.data.sessionId);
        setRemaining(res.data.remainingChats);

        // TTS
        speak(res.data.reply);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Lỗi gửi tin nhắn",
        "error"
      );
    } finally {
      setIsTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!botInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: "var(--space-6)" }}>
        <GlassCard padding="lg" className="text-center" style={{ maxWidth: 400 }}>
          <Bot size={48} style={{ margin: "0 auto var(--space-4)", opacity: 0.3 }} />
          <h2 style={{ marginBottom: "var(--space-2)" }}>Không tìm thấy bot</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Mã chia sẻ không hợp lệ hoặc bot đã bị xóa.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header__info">
          <div className="chat-header__avatar">
            <Bot size={22} />
          </div>
          <div>
            <div className="chat-header__name">{botInfo.name}</div>
            <div className="chat-header__subject">
              {botInfo.subject} · Lớp {botInfo.gradeLevel} · {botInfo.teacherName}
            </div>
          </div>
        </div>
        <div className="chat-header__stats">
          <div className="streak-badge">
            🔥 0
          </div>
          <div className="xp-bar-container">
            <Star size={14} style={{ color: "var(--warning)" }} />
            <span>L1</span>
            <div className="xp-bar">
              <div className="xp-bar__fill" style={{ width: "0%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Hat Selector */}
      {enableSixHats && (
        <div style={{ padding: "var(--space-2) var(--space-5)", borderBottom: "1px solid var(--glass-border)" }}>
          <HatSelector activeHat={activeHat} onSelect={setActiveHat} />
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="text-center" style={{ padding: "var(--space-12)", color: "var(--text-muted)" }}>
            <Bot size={56} style={{ margin: "0 auto var(--space-4)", opacity: 0.2 }} />
            <p style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>
              Xin chào! 👋
            </p>
            <p>Hãy đặt câu hỏi để bắt đầu học nhé!</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={remaining <= 0 || isTyping}
        isTTSActive={isTTSActive}
        onToggleTTS={() => setIsTTSActive(!isTTSActive)}
        showVoice
      />

      {/* Usage counter */}
      <div style={{ background: "rgba(0,0,0,0.2)", padding: "var(--space-2)" }}>
        <UsageCounter remaining={remaining} max={maxChats} />
      </div>
    </div>
  );
}
