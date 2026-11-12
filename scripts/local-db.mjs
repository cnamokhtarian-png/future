// Local PostgreSQL-compatible database for development and the Playwright smoke
// test, backed by PGlite (real Postgres compiled to WASM). This keeps `npm run
// test:e2e` fully self-contained: no external database or network needed.
//
//   node scripts/local-db.mjs
//
// Then point the app at it:
//   DATABASE_URL=postgresql://127.0.0.1:55432/postgres npm run start
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const db = await PGlite.create();

const migrationsDir = path.join(import.meta.dirname, "..", "drizzle");
const files = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
for (const file of files) {
  const sql = readFileSync(path.join(migrationsDir, file), "utf8");
  const statements = sql.split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean);
  for (const statement of statements) {
    await db.exec(statement);
  }
  console.log(`applied ${file} (${statements.length} statements)`);
}

const port = Number(process.env.LOCAL_DB_PORT || 55432);
// The app uses a small connection pool and the smoke test opens a second one;
// the default maxConnections of 1 would reject them.
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 30 });
await server.start();
console.log(`local postgres (pglite) listening on 127.0.0.1:${port}`);

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
