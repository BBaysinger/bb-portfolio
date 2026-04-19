import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getPublicRedirectForNdaUrl,
  isNdaRoutePath,
} from "@/utils/ndaRouteRedirect";

export function proxy(request: NextRequest) {
  const { nextUrl, cookies } = request;

  if (
    isNdaRoutePath(nextUrl.pathname) &&
    !cookies.get("payload-token")?.value
  ) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.pathname = getPublicRedirectForNdaUrl(
      nextUrl.pathname,
      nextUrl.searchParams,
    );
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals + static assets.
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$).*)",
  ],
};
