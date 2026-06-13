/**
 * Script: Promote a user to ADMIN
 * 
 * Usage: node promote_admin.js <email>
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./server/src/db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config({ path: "./server/.env" });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error("❌ Please provide an email: node promote_admin.js user@example.com");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  console.log(`⏳ Promoting ${email} to ADMIN...`);
  
  const [updated] = await db
    .update(schema.users)
    .set({ 
      role: "admin",
      isVerified: true 
    })
    .where(eq(schema.users.email, email))
    .returning();

  if (!updated) {
    console.error("❌ User not found");
    process.exit(1);
  }

  console.log("✅ Success! User is now an ADMIN.");
  console.log(updated);
}

main().catch(console.error);
