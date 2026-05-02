/**
 * Environment configuration — validated with Zod
 */

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid Neon connection string"),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  // Gemini AI
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  // CORS
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

export const envErrors = !parsed.success ? parsed.error.flatten().fieldErrors : null;

// Helper to ensure BETTER_AUTH_URL ends with /api/auth
const normalizeAuthUrl = (url: string) => {
  const clean = url.endsWith("/") ? url.slice(0, -1) : url;
  return clean.endsWith("/api/auth") ? clean : `${clean}/api/auth`;
};

// Fallback to a safe object if parsing fails to prevent crash
export const env = parsed.success ? {
  ...parsed.data,
  BETTER_AUTH_URL: normalizeAuthUrl(parsed.data.BETTER_AUTH_URL),
} : {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: (process.env.NODE_ENV as any) || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  BETTER_AUTH_URL: normalizeAuthUrl(process.env.BETTER_AUTH_URL || "http://localhost:3000"),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
} as any as z.infer<typeof envSchema>;

export type Env = z.infer<typeof envSchema>;
