/**
 * AI Chatbot Hỗ Trợ Tự Học — Server Entry Point
 *
 * Express server with:
 * - Better Auth (3 roles: teacher, parent, student)
 * - Drizzle ORM + Neon PostgreSQL
 * - Rate limiting, CORS, Helmet security
 * - Teacher, Parent, Chat routes
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env.js";
import { auth } from "./auth/index.js";
import { teacherRouter, parentRouter, chatRouter, trainingRouter } from "./routes/index.js";
import { errorHandler, globalLimiter, authLimiter } from "./middleware/index.js";

const app = express();

// ─── Security ───────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(globalLimiter);

// ─── Better Auth Handler ────────────────────────
// Mount BEFORE Express routes and body parser — Better Auth handles /api/auth/*
app.all("/api/auth/*", authLimiter, toNodeHandler(auth));

// ─── Body Parsing ───────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ─── API Routes ─────────────────────────────────
app.use("/api/teacher", teacherRouter);
app.use("/api/parent", parentRouter);
app.use("/api/chat", chatRouter);
app.use("/api/training", trainingRouter);

// ─── 404 ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint không tồn tại",
  });
});

// ─── Error Handler ──────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────
app.listen(env.PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║  🤖 AI Chatbot Hỗ Trợ Tự Học               ║
║  📡 Server running on port ${String(env.PORT).padEnd(5)}            ║
║  🌍 Environment: ${env.NODE_ENV.padEnd(15)}           ║
║  🔗 ${env.BETTER_AUTH_URL.padEnd(40)} ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
