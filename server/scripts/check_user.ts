import { db } from "../src/db/index.js";
import { users } from "../src/db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function checkUser() {
  console.log("🔍 Checking for demo teacher account...");
  
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, "giaovien.demo@gmail.com")
    });

    if (user) {
      console.log("✅ User found:");
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log("❌ User NOT found in database.");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking user:", error);
    process.exit(1);
  }
}

checkUser();
