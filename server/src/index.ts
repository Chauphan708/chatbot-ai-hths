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

// ─── CRITICAL: Global CORS & Preflight ──────────
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Broad allow for Vercel and Localhost for robustness
  if (origin && (origin.includes("vercel.app") || origin.includes("localhost"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, x-better-auth-origin, better-auth-origin");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Allowed Origins (Legacy check for specific cases)
const allowedOrigins = [
  env.CLIENT_URL,
  "https://chatbot-ai-hths-client.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
].map(url => url.endsWith("/") ? url.slice(0, -1) : url);

app.use(globalLimiter);

app.get("/api/db-check", async (_req, res) => {
  try {
    const { db } = await import("./db/index.js");
    const { users } = await import("./db/schema.js");
    const { count } = await import("drizzle-orm");
    const [result] = await db.select({ value: count() }).from(users);
    res.json({
      success: true,
      userCount: result.value,
      dbUrl: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.slice(0, 20)}...` : "not set"
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Request Logger ─────────────────────────────
app.use((req, res, next) => {
  if (env.NODE_ENV !== "test") {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || "None"}`);
  }
  next();
});

// ─── Better Auth Handler ────────────────────────
app.all("/api/auth/*", (req, res) => {
  // Ensure CORS headers are present even if previous middleware missed them
  const origin = req.headers.origin;
  if (origin) {
    const cleanOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
    if (allowedOrigins.includes(cleanOrigin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, x-better-auth-origin");
    }
  }
  
  // Skip toNodeHandler for OPTIONS as we already handled it above with app.options("*")
  if (req.method === "OPTIONS") return res.sendStatus(204);
  
  return toNodeHandler(auth)(req, res);
});

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
