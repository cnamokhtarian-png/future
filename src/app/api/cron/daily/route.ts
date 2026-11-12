import { closeMissingDays } from "@/lib/daily-review";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Runs every night at 00:00 Asia/Tehran (20:30 UTC; Tehran has no DST) and
// self-heals: it closes every missing day before today, so an invocation that
// fires late or after an outage still catches up. Verified via CRON_SECRET
// (Vercel attaches it as a Bearer token to cron requests). A ?secret= query
// parameter with the same value is also accepted so the operator can trigger
// a catch-up run manually from a browser.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const url = new URL(request.url);
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const querySecret = url.searchParams.get("secret");
  if (bearer !== secret && querySecret !== secret) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const mode = url.searchParams.get("mode") === "backfill" ? "backfill" : "cron";
  const aiBudget = Number(url.searchParams.get("aiBudget") || "3");
  const lookback = Number(url.searchParams.get("lookback") || (mode === "backfill" ? "45" : "14"));

  try {
    const closed = await closeMissingDays({
      mode,
      lookbackDays: lookback,
      aiBudget: Number.isFinite(aiBudget) ? aiBudget : 3,
    });
    return Response.json({ ok: true, mode, closed, count: closed.length });
  } catch (error) {
    console.error("Daily close failed", error);
    return Response.json({ ok: false, error: "بستن روز ناموفق بود؛ دوباره تلاش کن." }, { status: 500 });
  }
}
