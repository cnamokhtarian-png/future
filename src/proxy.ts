import { NextRequest, NextResponse } from "next/server";

// Optional HTTP Basic Auth, enabled only when SITE_AUTH_USER and
// SITE_AUTH_PASSWORD are set (used on the deployed site; local development
// stays open). The app is single-user and has no account system, so this is
// the cheapest way to keep personal data off the public internet.
const realm = "robeh-rah";

function unauthorized() {
  return new NextResponse("دسترسی نیازمند ورود است.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"` },
  });
}

export function proxy(request: NextRequest) {
  const user = process.env.SITE_AUTH_USER;
  const password = process.env.SITE_AUTH_PASSWORD;
  if (!user || !password) {
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6).trim());
      const separator = decoded.indexOf(":");
      if (separator !== -1) {
        const givenUser = decoded.slice(0, separator);
        const givenPassword = decoded.slice(separator + 1);
        if (givenUser === user && givenPassword === password) {
          return NextResponse.next();
        }
      }
    } catch {
      return unauthorized();
    }
  }
  return unauthorized();
}

export const config = {
  // Allow static assets, icons and the health probe through; protect everything else.
  // /api/health and /api/cron are exempt from Basic Auth; both guard themselves (health is public, cron uses CRON_SECRET).
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico|api/health|api/cron).*)"],
};
