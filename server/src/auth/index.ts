/**
 * Better Auth — Server Configuration
 *
 * 3 roles: teacher, parent, student
 * Uses Drizzle adapter with Neon PostgreSQL
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, admin } from "better-auth/plugins";
import { db } from "../db/index.js";
import { env } from "../config/env.js";
import * as schema from "../db/schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  plugins: [
    bearer(),
    admin()
  ],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
    // Ensure cookies work across subdomains/different domains on Vercel
    cookieOptions: {
      secure: true,
      sameSite: "none",
    }
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: true,
      },
    },
  },

  trustedOrigins: [
    env.CLIENT_URL.endsWith("/") ? env.CLIENT_URL.slice(0, -1) : env.CLIENT_URL,
    "https://chatbot-ai-hths-client.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
});

export type Auth = typeof auth;
