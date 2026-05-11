import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  LANDING_R_COOKIE,
  normalizeLandingR,
} from "@/utils/landingAttribution";
import {
  getPublicRedirectForNdaUrl,
  isNdaRoutePath,
} from "@/utils/ndaRouteRedirect";

function buildCleanRedirectUrl(nextUrl: NextRequest["nextUrl"]) {
  const redirectUrl = nextUrl.clone();
  redirectUrl.searchParams.delete("r");
  return redirectUrl;
}

function applyLandingRRedirectCookie(
  response: NextResponse,
  nextUrl: NextRequest["nextUrl"],
) {
  if (!nextUrl.searchParams.has("r")) return;

  const normalizedLandingR = normalizeLandingR(nextUrl.searchParams.get("r"));

  if (normalizedLandingR) {
    response.cookies.set(LANDING_R_COOKIE, normalizedLandingR, {
      httpOnly: false,
      sameSite: "lax",
      secure: nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 10,
    });
  } else {
    response.cookies.delete(LANDING_R_COOKIE);
  }
}

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
    const response = NextResponse.redirect(redirectUrl);
    applyLandingRRedirectCookie(response, nextUrl);
    return response;
  }

  if (nextUrl.searchParams.has("r")) {
    const redirectUrl = buildCleanRedirectUrl(nextUrl);
    const response = NextResponse.redirect(redirectUrl);
    applyLandingRRedirectCookie(response, nextUrl);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals + static assets.
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$).*)",
  ],
};
