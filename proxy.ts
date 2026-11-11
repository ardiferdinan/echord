import { NextResponse, type NextRequest } from "next/server";
import { SESSION, isValidSession } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  if (await isValidSession(req.cookies.get(SESSION)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Perlu login" }, { status: 401 });
  const url = new URL("/login", req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // everything except login, shared setlist links (/s/…, read-only) and static assets
  matcher: ["/((?!login|s/|_next/static|_next/image|favicon.ico|.*\\.(?:woff2?|png|jpg|svg|ico)$).*)"],
};
