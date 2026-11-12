import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    // Diagnostics: surface only the underlying error code (e.g. "28P01",
    // "XX000", "ENOTFOUND") — never messages, which may leak internals.
    const cause =
      error instanceof Error && error.cause instanceof Error ? error.cause : error;
    const code = (cause as { code?: string })?.code;
    return Response.json({ ok: false, code: code ?? "unknown" }, { status: 500 });
  }
}
