/**
 * Database connection — Neon PostgreSQL + Drizzle ORM
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL is not set. Please add it to your .env file.\n" +
      "   Get your free Neon database at: https://neon.tech"
  );
}

const sql = neon(DATABASE_URL);

export const db = drizzle(sql, { schema });

export type Database = typeof db;
