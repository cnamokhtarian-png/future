import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error ? error.cause : null;
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        cause: cause ? { message: cause.message, code: (cause as { code?: string }).code, name: cause.name } : null,
      },
      { status: 500 },
    );
  }
}
