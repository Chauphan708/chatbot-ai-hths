import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function addExtension() {
  console.log("Creating vector extension...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log("Done.");
}

addExtension().catch(console.error);
