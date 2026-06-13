/**
 * Gamification Components — XPBar, StreakBadge, LevelUpModal
 */

import { useState, useEffect, type ReactNode } from "react";
import { Flame, Star, Trophy, Sparkles } from "lucide-react";
import { Modal, Button } from "../ui";

// ─── XP Bar ───────────────────────────────────────────

interface XPBarProps {
  totalXp: number;
  level: number;
}

/** XP needed for each level (simple formula) */
function xpForLevel(level: number): number {
  return level * 100;
}

export function XPBar({ totalXp, level }: XPBarProps) {
  const currentLevelXp = xpForLevel(level);
  const prevLevelXp = level > 1 ? xpForLevel(level - 1) : 0;
  const xpInLevel = totalXp - prevLevelXp * level; // simplified
  const progress = Math.min((xpInLevel / currentLevelXp) * 100, 100);

  return (
    <div className="xp-bar-container">
      <Star size={14} style={{ color: "var(--warning)" }} />
      <span style={{ fontWeight: 600 }}>L{level}</span>
      <div className="xp-bar" style={{ width: 100 }}>
        <div className="xp-bar__fill" style={{ width: `${progress}%` }} />
      </div>
      <span style={{ color: "var(--text-muted)" }}>{totalXp} XP</span>
    </div>
  );
}

// ─── Streak Badge ─────────────────────────────────────

interface StreakBadgeProps {
  days: number;
}

export function StreakBadge({ days }: StreakBadgeProps) {
  return (
    <div className="streak-badge" title={`${days} ngày liên tiếp`}>
      <Flame size={16} />
      <span>{days}</span>
    </div>
  );
}

// ─── Level Up Modal ───────────────────────────────────

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
}

export function LevelUpModal({ isOpen, onClose, newLevel }: LevelUpModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="text-center" style={{ padding: "var(--space-4)" }}>
        {showConfetti && <ConfettiEffect />}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--warning), hsl(30, 90%, 55%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto var(--space-5)",
            animation: "fadeInScale 0.5s ease",
          }}
        >
          <Trophy size={40} color="white" />
        </div>
        <h2
          style={{
            fontSize: "var(--text-2xl)",
            fontWeight: 700,
            marginBottom: "var(--space-2)",
            fontFamily: "var(--font-heading)",
          }}
        >
          🎉 Lên cấp!
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
          Chúc mừng con đã đạt
        </p>
        <div
          style={{
            fontSize: "var(--text-4xl)",
            fontWeight: 700,
            color: "var(--warning)",
            marginBottom: "var(--space-5)",
            fontFamily: "var(--font-heading)",
          }}
        >
          Level {newLevel}
        </div>
        <Button onClick={onClose} fullWidth>
          <Sparkles size={16} /> Tuyệt vời!
        </Button>
      </div>
    </Modal>
  );
}

// ─── Confetti Effect (CSS-based) ──────────────────────

function ConfettiEffect(): ReactNode {
  const colors = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#A8D8EA"];
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    size: 6 + Math.random() * 6,
  }));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3000,
        overflow: "hidden",
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: -10,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            backgroundColor: p.color,
            animation: `confettiFall 2.5s ease-in ${p.delay} forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
