import { auth } from "../src/auth/index.js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function testLogin() {
  console.log("🚀 Testing login for demo teacher account...");
  
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: "giaovien.demo@gmail.com",
        password: "Password123!"
      }
    });

    console.log("✅ Login Result:", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("❌ Login Failed:", error);
    process.exit(1);
  }
}

testLogin();
