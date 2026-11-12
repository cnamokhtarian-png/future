import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROBE_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"];

type ProbeResult = { model: string; status: number | null; message: string; ok: boolean };

async function probeModel(key: string, model: string): Promise<ProbeResult> {
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key, "Api-Revision": "2026-05-20" },
      body: JSON.stringify({
        model,
        input: [{ type: "user_input", content: [{ type: "text", text: "سلام" }] }],
        store: false,
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (response.ok) {
      const data = (await response.json()) as { output_text?: string };
      return { model, status: response.status, ok: true, message: (data.output_text || "").slice(0, 80) || "(no text)" };
    }
    let message = "";
    try {
      message = ((await response.json()) as { error?: { message?: string } })?.error?.message || "";
    } catch {
      message = "(body unreadable)";
    }
    return { model, status: response.status, ok: false, message: message.slice(0, 300) };
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    return { model, status: null, ok: false, message: name };
  }
}

export async function GET(request: Request) {
  // Token-gated Gemini probe (lets the operator diagnose model availability from
  // the browser without exposing the key; requires the site password).
  const probe = new URL(request.url).searchParams.get("probe");
  if (probe !== null) {
    const password = process.env.SITE_AUTH_PASSWORD;
    const key = process.env.GEMINI_API_KEY;
    if (!password || probe !== password) {
      return Response.json({ probe: "unauthorized" }, { status: 401 });
    }
    if (!key) {
      return Response.json({ probe: "missing_gemini_key" }, { status: 500 });
    }
    const results: ProbeResult[] = [];
    for (const model of PROBE_MODELS) {
      results.push(await probeModel(key, model));
    }
    return Response.json({ probe: results });
  }

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
