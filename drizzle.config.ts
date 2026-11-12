import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load Next-style .env.local first (used in development), then .env as fallback.
config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is required (set it in .env.local or the environment)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
