import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  void request;
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals + static assets.
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$).*)",
  ],
};
