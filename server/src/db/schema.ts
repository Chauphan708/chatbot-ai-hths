import crypto from "node:crypto";
/**
 * Database Schema — AI Chatbot Hỗ Trợ Tự Học
 *
 * Bảng chính:
 * - users: GV, PH, HS (3 roles)
 * - parent_children: Quan hệ PH → HS
 * - chatbots: Bot do GV tạo
 * - training_data: Dữ liệu huấn luyện + embedding vector
 * - chat_sessions: Phiên chat
 * - chat_messages: Tin nhắn trong phiên
 * - daily_usage: Giới hạn 10 lượt/ngày
 * - student_progress: Gamification (XP, level, badges)
 * - student_insights: GV Analytics — auto-tag lỗi HS
 */

import {
  pgTable,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
  vector,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "teacher",
  "parent",
  "student",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "student",
  "bot",
  "system",
]);

// ─── Users ────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    role: text("role").notNull().default("student"), // teacher, parent, student, admin
    image: text("image"),
    emailVerified: boolean("email_verified").notNull().default(false),
    isVerified: boolean("is_verified").notNull().default(true), // Dành cho GV (mặc định true cho HS/PH để không bị block)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_users_email").on(table.email)]
);

export const usersRelations = relations(users, ({ many }) => ({
  chatbots: many(chatbots),
  parentLinks: many(parentChildren, { relationName: "parent" }),
  childLinks: many(parentChildren, { relationName: "child" }),
  chatSessions: many(chatSessions),
  progress: many(studentProgress),
}));

// ─── Parent-Children Relationship ─────────────────────

export const parentChildren = pgTable(
  "parent_children",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    parentId: text("parent_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    childId: text("child_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_parent_child_unique").on(table.parentId, table.childId),
  ]
);

export const parentChildrenRelations = relations(parentChildren, ({ one }) => ({
  parent: one(users, {
    fields: [parentChildren.parentId],
    references: [users.id],
    relationName: "parent",
  }),
  child: one(users, {
    fields: [parentChildren.childId],
    references: [users.id],
    relationName: "child",
  }),
}));

// ─── Chatbots ─────────────────────────────────────────

export const chatbots = pgTable(
  "chatbots",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    subject: varchar("subject", { length: 50 }).notNull(),
    gradeLevel: integer("grade_level").notNull().default(4),
    systemPrompt: text("system_prompt"),
    botPersona: text("bot_persona"),
    scaffoldingDefault: integer("scaffolding_default").notNull().default(1),
    enableSixHats: boolean("enable_six_hats").notNull().default(false),
    shareCode: varchar("share_code", { length: 20 }).unique(),
    cloneFromId: text("clone_from_id"),
    maxDailyChats: integer("max_daily_chats").notNull().default(10),
    isPublic: boolean("is_public").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    classId: text("class_id")
      .references(() => classes.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_chatbots_teacher").on(table.teacherId),
    index("idx_chatbots_share_code").on(table.shareCode),
  ]
);

export const chatbotsRelations = relations(chatbots, ({ one, many }) => ({
  teacher: one(users, {
    fields: [chatbots.teacherId],
    references: [users.id],
  }),
  trainingData: many(trainingData),
  sessions: many(chatSessions),
  dailyUsage: many(dailyUsage),
  insights: many(studentInsights),
}));

// ─── Training Data ────────────────────────────────────

export const trainingData = pgTable(
  "training_data",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    chatbotId: text("chatbot_id")
      .notNull()
      .references(() => chatbots.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    content: text("content").notNull(),
    commonMistakes: jsonb("common_mistakes").$type<string[]>(),
    scaffoldingHints: jsonb("scaffolding_hints").$type<
      Record<string, string>
    >(),
    embedding: vector("embedding", { dimensions: 768 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_training_data_chatbot").on(table.chatbotId)]
);

export const trainingDataRelations = relations(trainingData, ({ one }) => ({
  chatbot: one(chatbots, {
    fields: [trainingData.chatbotId],
    references: [chatbots.id],
  }),
}));

// ─── Chat Sessions ────────────────────────────────────

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    chatbotId: text("chatbot_id")
      .notNull()
      .references(() => chatbots.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    messagesCount: integer("messages_count").notNull().default(0),
    xpEarned: integer("xp_earned").notNull().default(0),
    activeHat: varchar("active_hat", { length: 20 }),
    scaffoldingLevel: integer("scaffolding_level").notNull().default(1),
  },
  (table) => [
    index("idx_sessions_chatbot").on(table.chatbotId),
    index("idx_sessions_student").on(table.studentId),
    index("idx_sessions_started").on(table.startedAt),
  ]
);

export const chatSessionsRelations = relations(
  chatSessions,
  ({ one, many }) => ({
    chatbot: one(chatbots, {
      fields: [chatSessions.chatbotId],
      references: [chatbots.id],
    }),
    student: one(users, {
      fields: [chatSessions.studentId],
      references: [users.id],
    }),
    messages: many(chatMessages),
  })
);

// ─── Chat Messages ────────────────────────────────────

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    hatMode: varchar("hat_mode", { length: 20 }),
    scaffoldingAction: varchar("scaffolding_action", { length: 50 }),
    isVoice: boolean("is_voice").notNull().default(false),
    flagged: boolean("flagged").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_messages_session").on(table.sessionId),
    index("idx_messages_created").on(table.createdAt),
  ]
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// ─── Daily Usage (Rate Limit 10/day) ──────────────────

export const dailyUsage = pgTable(
  "daily_usage",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatbotId: text("chatbot_id")
      .notNull()
      .references(() => chatbots.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("idx_daily_usage_unique").on(
      table.studentId,
      table.chatbotId,
      table.date
    ),
  ]
);

export const dailyUsageRelations = relations(dailyUsage, ({ one }) => ({
  student: one(users, {
    fields: [dailyUsage.studentId],
    references: [users.id],
  }),
  chatbot: one(chatbots, {
    fields: [dailyUsage.chatbotId],
    references: [chatbots.id],
  }),
}));

// ─── Student Progress (Gamification) ──────────────────

export const studentProgress = pgTable(
  "student_progress",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatbotId: text("chatbot_id")
      .notNull()
      .references(() => chatbots.id, { onDelete: "cascade" }),
    totalXp: integer("total_xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    streakDays: integer("streak_days").notNull().default(0),
    badges: jsonb("badges").$type<string[]>().default([]),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_progress_unique").on(table.studentId, table.chatbotId),
  ]
);

export const studentProgressRelations = relations(
  studentProgress,
  ({ one }) => ({
    student: one(users, {
      fields: [studentProgress.studentId],
      references: [users.id],
    }),
    chatbot: one(chatbots, {
      fields: [studentProgress.chatbotId],
      references: [chatbots.id],
    }),
  })
);

// ─── Student Insights (GV Analytics) ──────────────────

export const studentInsights = pgTable(
  "student_insights",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    chatbotId: text("chatbot_id")
      .notNull()
      .references(() => chatbots.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: varchar("topic", { length: 200 }).notNull(),
    errorType: varchar("error_type", { length: 200 }),
    errorCount: integer("error_count").notNull().default(0),
    needsSupport: boolean("needs_support").notNull().default(false),
    lastOccurred: timestamp("last_occurred", { withTimezone: true }),
    notes: text("notes"),
  },
  (table) => [
    index("idx_insights_chatbot").on(table.chatbotId),
    index("idx_insights_student").on(table.studentId),
    index("idx_insights_support").on(table.needsSupport),
  ]
);

export const studentInsightsRelations = relations(
  studentInsights,
  ({ one }) => ({
    chatbot: one(chatbots, {
      fields: [studentInsights.chatbotId],
      references: [chatbots.id],
    }),
    student: one(users, {
      fields: [studentInsights.studentId],
      references: [users.id],
    }),
  })
);

// ─── Classes & Members ────────────────────────────────
// GV tạo lớp, PH/HS gia nhập và được GV xác minh

export const classes = pgTable(
  "classes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 200 }).notNull(),
    academicYear: varchar("academic_year", { length: 20 }).notNull(), // Ví dụ: "2024-2025"
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_classes_teacher").on(table.teacherId),
    uniqueIndex("idx_classes_unique_name").on(table.teacherId, table.name, table.academicYear),
  ]
);

export const classMembers = pgTable(
  "class_members",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "parent" hoặc "student"
    isVerified: boolean("is_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_class_user_unique").on(table.classId, table.userId),
    index("idx_class_members_class").on(table.classId),
    index("idx_class_members_user").on(table.userId),
  ]
);

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
  }),
  members: many(classMembers),
}));

export const classMembersRelations = relations(classMembers, ({ one }) => ({
  class: one(classes, {
    fields: [classMembers.classId],
    references: [classes.id],
  }),
  user: one(users, {
    fields: [classMembers.userId],
    references: [users.id],
  }),
}));

// ─── Better Auth Sessions & Accounts ──────────────────
// Better Auth manages its own tables, but we define them
// here so Drizzle is aware of them for type-safety

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
