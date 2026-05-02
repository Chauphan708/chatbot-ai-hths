/**
 * AI Chatbot Hỗ Trợ Tự Học — Server Entry Point
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { env, envErrors } from "./config/env.js";
import { auth } from "./auth/index.js";
import { teacherRouter, parentRouter, chatRouter, trainingRouter } from "./routes/index.js";
import { errorHandler, globalLimiter, authLimiter } from "./middleware/index.js";

const app = express();

// ─── Security ───────────────────────────────────
app.use(helmet());

// Clean CLIENT_URL helper
const getCleanOrigin = (url: string) => url.endsWith("/") ? url.slice(0, -1) : url;

app.use(
  cors({
    origin: true, // Reflect the request origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// Explicitly handle OPTIONS for all routes
app.options("*", cors());

app.use(globalLimiter);

// ─── Better Auth Handler ────────────────────────
app.all("/api/auth/*", authLimiter, toNodeHandler(auth));

// ─── Body Parsing ───────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health & Debug Check ───────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/debug-env", (_req, res) => {
  res.json({
    isValid: envErrors === null,
    errors: envErrors,
    values: {
      CLIENT_URL: env.CLIENT_URL ? `${env.CLIENT_URL.slice(0, 15)}...` : "not set",
      BETTER_AUTH_URL: env.BETTER_AUTH_URL ? `${env.BETTER_AUTH_URL.slice(0, 15)}...` : "not set",
      NODE_ENV: env.NODE_ENV,
    }
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
