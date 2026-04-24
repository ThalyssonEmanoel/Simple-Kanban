import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request) {
  // API routes run their own auth guards (requireUser/requireProjectAccess).
  // Running the Supabase session check here too adds a round-trip per request.
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|webmanifest)$).*)",
  ],
};
