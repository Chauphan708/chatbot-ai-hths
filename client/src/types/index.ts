/**
 * API Types — Shared TypeScript interfaces
 * Maps to backend Drizzle schema + API responses
 */

// ─── User & Auth ──────────────────────────────────────

export type UserRole = "teacher" | "parent" | "student";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatarUrl?: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

// ─── Chatbot ──────────────────────────────────────────

export interface Chatbot {
  id: string;
  teacherId: string;
  name: string;
  subject: string;
  gradeLevel: number;
  systemPrompt?: string | null;
  botPersona?: string | null;
  scaffoldingDefault: number;
  enableSixHats: boolean;
  shareCode?: string | null;
  cloneFromId?: string | null;
  maxDailyChats: number;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatbotPayload {
  name: string;
  subject: string;
  gradeLevel: number;
  systemPrompt?: string;
  botPersona?: string;
  scaffoldingDefault?: number;
  enableSixHats?: boolean;
  maxDailyChats?: number;
}

export interface UpdateChatbotPayload extends Partial<CreateChatbotPayload> {
  isActive?: boolean;
  isPublic?: boolean;
}

// ─── Training Data ────────────────────────────────────

export interface TrainingDataItem {
  id: string;
  chatbotId: string;
  title: string;
  content: string;
  commonMistakes?: string[] | null;
  scaffoldingHints?: Record<string, string> | null;
  createdAt: string;
}

export interface CreateTrainingDataPayload {
  title: string;
  content: string;
  commonMistakes?: string[];
  scaffoldingHints?: Record<string, string>;
}

// ─── Chat ─────────────────────────────────────────────

export type MessageRole = "student" | "bot" | "system";

export interface ChatSession {
  id: string;
  chatbotId: string;
  studentId: string;
  startedAt: string;
  endedAt?: string | null;
  messagesCount: number;
  xpEarned: number;
  activeHat?: string | null;
  scaffoldingLevel: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  hatMode?: string | null;
  scaffoldingAction?: string | null;
  isVoice: boolean;
  flagged: boolean;
  createdAt: string;
}

export interface SendMessagePayload {
  message: string;
  sessionId?: string;
  isVoice?: boolean;
}

export interface SendMessageResponse {
  reply: string;
  sessionId: string;
  hatMode?: string;
  scaffoldingAction?: string;
  remainingChats: number;
}

export interface FeedbackPayload {
  sessionId: string;
  rating: number;
  comment?: string;
}

// ─── Gamification ─────────────────────────────────────

export interface StudentProgress {
  id: string;
  studentId: string;
  chatbotId: string;
  totalXp: number;
  level: number;
  streakDays: number;
  badges: string[];
  lastActiveAt?: string | null;
}

// ─── Analytics ────────────────────────────────────────

export interface StudentInsight {
  id: string;
  chatbotId: string;
  studentId: string;
  topic: string;
  errorType?: string | null;
  errorCount: number;
  needsSupport: boolean;
  lastOccurred?: string | null;
  notes?: string | null;
  student?: { displayName: string; email: string };
}

export interface AnalyticsData {
  totalStudents: number;
  totalSessions: number;
  totalMessages: number;
  insightsNeedingSupport: StudentInsight[];
  leaderboard: Array<{
    studentId: string;
    displayName: string;
    totalXp: number;
    level: number;
    streakDays: number;
  }>;
}

// ─── Parent ───────────────────────────────────────────

export interface ChildInfo {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

// ─── API Response Wrapper ─────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
