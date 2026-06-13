/**
 * GamificationPanel — Leaderboard, Quests, and Badges for Students
 */

import { useState, useEffect, useCallback } from "react";
import { Trophy, Target, Award, Flame, X } from "lucide-react";
import { GlassCard, Spinner, showToast } from "../ui";
import { chatApi } from "../../services/chatApi";

interface GamificationPanelProps {
  shareCode: string;
  onClose: () => void;
}

export function GamificationPanel({ shareCode, onClose }: GamificationPanelProps) {
  const [activeTab, setActiveTab] = useState<"quests" | "leaderboard" | "badges">("quests");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ totalXp: number; level: number; streakDays: number; badges: string[] } | null>(null);
  const [quests, setQuests] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [progRes, questRes, leadRes, badgeRes] = await Promise.all([
        chatApi.getProgress(shareCode),
        chatApi.getQuests(shareCode),
        chatApi.getLeaderboard(shareCode),
        chatApi.getBadges(shareCode),
      ]);
      setProgress(progRes.data || null);
      setQuests(questRes.data || []);
      setLeaderboard(leadRes.data || []);
      setBadges(badgeRes.data || []);
    } catch {
      showToast("Lỗi khi tải thông tin tiến độ học tập", "error");
    } finally {
      setLoading(false);
    }
  }, [shareCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Level curve calculations
  const currentXp = progress?.totalXp ?? 0;
  const currentLevel = progress?.level ?? 1;
  const xpForCurrentLevel = (currentLevel - 1) * (currentLevel - 2) * 50;
  const xpForNextLevel = currentLevel * (currentLevel - 1) * 50 || 100;
  const xpInThisLevel = currentXp - xpForCurrentLevel;
  const xpNeededForThisLevel = xpForNextLevel - xpForCurrentLevel;
  const percentComplete = Math.min(100, Math.max(0, (xpInThisLevel / xpNeededForThisLevel) * 100));

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "var(--space-4)",
      }}
    >
      <GlassCard
        padding="lg"
        style={{
          width: "100%",
          maxWidth: 580,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "var(--space-4)",
            right: "var(--space-4)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--glass-border)",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
          title="Đóng"
        >
          <X size={16} />
        </button>

        {/* Profile Card Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--warning), var(--accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color: "white",
              fontWeight: "bold",
              boxShadow: "0 0 15px rgba(245, 158, 11, 0.3)",
            }}
          >
            {currentLevel}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <h3 style={{ fontWeight: 700, fontSize: "var(--text-lg)" }}>
                Cấp độ {currentLevel}
              </h3>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 2,
                  fontSize: "var(--text-xs)",
                  color: "var(--warning)",
                  background: "rgba(245, 158, 11, 0.15)",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontWeight: 600,
                }}
              >
                <Flame size={12} fill="var(--warning)" />
                {progress?.streakDays ?? 0} Ngày
              </div>
            </div>

            {/* XP progress bar */}
            <div style={{ marginTop: "var(--space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xxs)", color: "var(--text-muted)", marginBottom: 4 }}>
                <span>{currentXp} XP</span>
                <span>{xpForNextLevel} XP để lên cấp</span>
              </div>
              <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${percentComplete}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--warning), var(--accent))",
                    borderRadius: 4,
                    transition: "width 0.5s ease-out",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.2)",
            padding: 4,
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
          }}
        >
          <button
            onClick={() => setActiveTab("quests")}
            style={{
              flex: 1,
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "quests" ? "rgba(255,255,255,0.1)" : "transparent",
              color: activeTab === "quests" ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
            }}
          >
            <Target size={15} />
            Nhiệm vụ
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            style={{
              flex: 1,
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "leaderboard" ? "rgba(255,255,255,0.1)" : "transparent",
              color: activeTab === "leaderboard" ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
            }}
          >
            <Trophy size={15} />
            Bảng hạng
          </button>
          <button
            onClick={() => setActiveTab("badges")}
            style={{
              flex: 1,
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "badges" ? "rgba(255,255,255,0.1)" : "transparent",
              color: activeTab === "badges" ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
            }}
          >
            <Award size={15} />
            Huy hiệu
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 280, paddingRight: 4 }}>
          {loading ? (
            <div className="flex justify-center items-center" style={{ height: "100%" }}>
              <Spinner size="md" />
            </div>
          ) : activeTab === "quests" ? (
            <div>
              <h4 style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginBottom: "var(--space-3)", color: "var(--text-secondary)" }}>
                Nhiệm vụ hôm nay
              </h4>
              {quests.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--space-8)" }}>
                  <p>Hôm nay giáo viên không giao nhiệm vụ nào. Hãy chat tự do nhé! 🎈</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {quests.map((quest) => {
                    const pct = Math.min(100, Math.round((quest.progress.currentValue / quest.targetValue) * 100));
                    return (
                      <GlassCard key={quest.id} padding="sm">
                        <div style={{ display: "flex", alignItems: "start", gap: "var(--space-3)" }}>
                          <div style={{ fontSize: 24 }}>
                            {quest.progress.isCompleted ? "✅" : "🎯"}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: quest.progress.isCompleted ? "var(--success)" : "var(--text-primary)" }}>
                                {quest.title}
                              </span>
                              <span style={{ fontSize: "var(--text-xs)", color: "var(--warning)", fontWeight: 600 }}>
                                +{quest.xpReward} XP
                              </span>
                            </div>
                            {quest.description && (
                              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                                {quest.description}
                              </p>
                            )}

                            {/* Progress info */}
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xxs)", color: "var(--text-muted)", marginTop: "var(--space-2)", marginBottom: 2 }}>
                              <span>Tiến độ: {quest.progress.currentValue} / {quest.targetValue}</span>
                              <span>{pct}%</span>
                            </div>
                            <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background: quest.progress.isCompleted ? "var(--success)" : "var(--primary)",
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === "leaderboard" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {leaderboard.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--space-8)" }}>
                  <Trophy size={32} style={{ margin: "0 auto var(--space-3)", opacity: 0.3 }} />
                  <p>Chưa có xếp hạng lớp học</p>
                </div>
              ) : (
                leaderboard.map((student, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const isTop3 = i < 3;
                  return (
                    <div
                      key={student.studentId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-2) var(--space-3)",
                        background: isTop3 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <span style={{ fontSize: isTop3 ? 20 : 14, width: 28, textAlign: "center", fontWeight: 700 }}>
                        {isTop3 ? medals[i] : i + 1}
                      </span>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "var(--primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: "bold",
                        }}
                      >
                        {student.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{student.name}</div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Level {student.level}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "var(--warning)", fontSize: "var(--text-sm)" }}>{student.totalXp} XP</div>
                        <div style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)" }}>🔥 {student.streakDays}d</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div>
              <h4 style={{ fontWeight: 600, fontSize: "var(--text-sm)", marginBottom: "var(--space-4)", color: "var(--text-secondary)" }}>
                Huy hiệu đạt được
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "var(--space-3)" }}>
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      padding: "var(--space-3)",
                      background: badge.earned ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.2)",
                      border: `1px solid ${badge.earned ? "var(--glass-border)" : "transparent"}`,
                      borderRadius: "var(--radius-md)",
                      opacity: badge.earned ? 1 : 0.4,
                      transition: "all 0.3s ease",
                      position: "relative",
                    }}
                    title={`${badge.name}: ${badge.description}`}
                  >
                    <div style={{ fontSize: 36, marginBottom: 8, filter: badge.earned ? "none" : "grayscale(100%)" }}>
                      {badge.icon}
                    </div>
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {badge.name}
                    </span>
                    <span style={{ fontSize: "var(--text-xxs)", color: "var(--text-muted)", marginTop: 4 }}>
                      {badge.earned ? "Đã đạt" : "Khóa"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
