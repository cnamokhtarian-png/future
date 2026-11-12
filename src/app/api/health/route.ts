import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    // Return only the underlying error code (e.g. "28P01", "ENOTFOUND") — never
    // messages, which may leak hosts or credentials.
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? (error.cause as { code?: string }).code
        : undefined;
    const own = (error as { code?: string }).code;
    return Response.json(
      { ok: false, code: cause ?? own ?? "unknown" },
      { status: 500 },
    );
  }
}
