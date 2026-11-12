import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// pg merges the connection string OVER the explicit `ssl` pool option, so an
// `sslmode=require` query param (which parses to `ssl: {}`, i.e. verify the
// certificate) would silently defeat `rejectUnauthorized: false`. Strip the
// query params that carry SSL semantics and decide SSL handling here instead.
function normalizeDatabaseUrl(raw: string): {
  connectionString: string;
  needsSsl: boolean;
} {
  const supabaseHost = /\.supabase\.(co|com)(:|\/|$)/.test(raw);
  try {
    const url = new URL(raw);
    const sslmode = url.searchParams.get("sslmode");
    const needsSsl =
      (sslmode !== null && sslmode !== "disable") || supabaseHost;
    for (const param of [
      "sslmode",
      "sslcert",
      "sslkey",
      "sslrootcert",
      "uselibpqcompat",
      "sslnegotiation",
    ]) {
      url.searchParams.delete(param);
    }
    return { connectionString: url.toString(), needsSsl };
  } catch {
    return {
      connectionString: raw,
      needsSsl: /sslmode=(require|verify-ca|verify-full|no-verify)/.test(raw) || supabaseHost,
    };
  }
}

const { connectionString, needsSsl } = normalizeDatabaseUrl(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    // Serverless functions should not fan out into huge pools; the Supabase
    // pooler (port 6543) multiplexes many clients for us.
    max: Number(process.env.PG_POOL_MAX) > 0 ? Number(process.env.PG_POOL_MAX) : 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
