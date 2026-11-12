import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    // Diagnostics: surface the underlying error code and a sanitized message.
    // Any connection-string-like fragments are redacted before returning.
    const cause =
      error instanceof Error && error.cause instanceof Error ? error.cause : error;
    const raw = cause instanceof Error ? cause.message : String(cause);
    const sanitized = raw
      .replace(/postgres(ql)?:\/\/\S+/gi, "[connection string redacted]")
      .replace(/sslmode=\S+/gi, "[redacted]")
      .slice(0, 300);
    const code = (cause as { code?: string })?.code;
    return Response.json({ ok: false, code: code ?? "unknown", detail: sanitized }, { status: 500 });
  }
}
