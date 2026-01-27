import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "bb_landing_r";

function normalizeR(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Keep it simple + safe: allow short slugs like "github", "hn", "newsletter-jan".
  // Reject anything that looks like a URL or has weird characters.
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(trimmed)) return null;

  return trimmed;
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const r = normalizeR(url.searchParams.get("r"));

  if (!r) return NextResponse.next();

  const res = NextResponse.next();

  // Persist attribution long enough to make it through a browse → login flow.
  // We clear it on successful login server-side.
  res.cookies.set({
    name: COOKIE_NAME,
    value: r,
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}

export const config = {
  matcher: [
    // Skip Next internals + static assets.
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$).*)",
  ],
};
