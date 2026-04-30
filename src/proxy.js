import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Per-IP rate limiting on API routes. Sensitive paths get a tighter cap.
  // These are deliberately conservative — a real user clicking quickly stays
  // well under, but a script doing 50 req/s gets 429 immediately.
  if (pathname.startsWith("/api")) {
    const ip = getClientIp(request);

    // Strictest bucket for auth-touching paths (notifications PUT triggers writes,
    // projects/join is brute-forceable).
    const isSensitive =
      pathname.startsWith("/api/projects/join") ||
      pathname.startsWith("/api/auth");

    const { ok, retryAfter } = isSensitive
      ? rateLimit(`sensitive:${ip}`, 10, 60_000)   // 10 req / minute
      : rateLimit(`api:${ip}:${pathname}`, 60, 60_000); // 60 req / min / route

    if (!ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Aguarde um instante." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    // API routes run their own auth guards (requireUser/requireProjectAccess).
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|webmanifest)$).*)",
  ],
};
