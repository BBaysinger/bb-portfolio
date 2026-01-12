/**
 * Frontend API proxy for `POST /api/users/logout`.
 *
 * Purpose:
 * - Provides a stable frontend-origin logout endpoint.
 * - Proxies the logout request to the backend Payload route.
 * - Clears auth cookies on the frontend origin to avoid stale-session edge cases.
 *
 * Notes:
 * - Forwards incoming cookies so the backend can invalidate the correct session.
 * - Also applies a safety-net cookie expiration for `payload-token` on this host.
 * - Disables caching explicitly.
 *
 * Rendering/caching:
 * - Marked `force-dynamic` with `revalidate = 0` so requests are never cached.
 *
 * Environment:
 * - `BACKEND_INTERNAL_URL` (preferred)
 * - `ENV_PROFILE` / `NODE_ENV` (used to pick a Docker service DNS fallback)
 * - `DEBUG_API_AUTH` (optional; enables verbose logging)
 */
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Proxies logout to the backend and clears auth cookies.
 *
 * @param request - Incoming request (cookies are forwarded when present).
 * @returns A JSON response containing a success message, or `{ error }` on failure.
 */
export async function POST(request: NextRequest) {
  try {
    // Resolve backend URL with environment normalization and internal preference
    const rawProfile = (
      process.env.ENV_PROFILE ||
      process.env.NODE_ENV ||
      ""
    ).toLowerCase();
    const normalizedProfile = rawProfile.startsWith("prod")
      ? "prod"
      : rawProfile === "development" || rawProfile.startsWith("dev")
        ? "dev"
        : rawProfile.startsWith("local")
          ? "local"
          : rawProfile;
    const preferred = process.env.BACKEND_INTERNAL_URL || "";
    const serviceDnsFallback =
      normalizedProfile === "dev"
        ? "http://bb-portfolio-backend-dev:3000"
        : normalizedProfile === "prod"
          ? "http://bb-portfolio-backend-prod:3000"
          : normalizedProfile === "local"
            ? "http://bb-portfolio-backend-local:3001"
            : "";
    const reqHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const isSameHost = (() => {
      try {
        const u = new URL(preferred);
        return !!reqHost && u.host === reqHost;
      } catch {
        return false;
      }
    })();
    const backendUrl = (() => {
      if (preferred && !isSameHost) return preferred;
      if (serviceDnsFallback) return serviceDnsFallback;
      return preferred || "http://localhost:8081";
    })();

    const debug =
      process.env.DEBUG_API_AUTH === "1" ||
      process.env.NODE_ENV !== "production";
    if (debug) console.info("🔗 Backend URL:", backendUrl);

    // Forward cookies from the request to maintain session
    const cookieHeader = request.headers.get("cookie") || "";
    if (debug) {
      const cookieNames = cookieHeader
        ? cookieHeader.split(/;\s*/).map((c) => c.split("=")[0])
        : [];
      console.info(
        "🍪 Logout API - Incoming cookies (names only):",
        cookieNames,
      );
    }

    const response = await fetch(
      `${backendUrl.replace(/\/$/, "")}/api/users/logout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader && { Cookie: cookieHeader }),
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { error: data.message || "Logout failed" },
        { status: response.status },
      );
    }

    // Create successful response
    const nextResponse = NextResponse.json({
      message: "Logged out successfully",
    });

    // Safety net: ensure the auth cookie is expired on this host.
    // This avoids cases where the backend's Set-Cookie domain/path doesn't match
    // the public frontend host, leaving a stale cookie that can break SSR.
    try {
      nextResponse.cookies.set({
        name: "payload-token",
        value: "",
        path: "/",
        expires: new Date(0),
      });
    } catch {
      // If cookies API isn't available for some runtime, continue.
    }
    // Explicitly disable caching
    nextResponse.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    nextResponse.headers.set("Pragma", "no-cache");
    nextResponse.headers.set("Expires", "0");

    // Forward any set-cookie headers from backend (these should clear cookies)
    const setCookieHeader = response.headers.get("set-cookie");
    if (debug) {
      // Do not log raw Set-Cookie values in production
      console.info(
        "🧹 Backend set-cookie header present:",
        Boolean(setCookieHeader),
      );
    }

    if (setCookieHeader) {
      // Pass through backend cookie clearing (single-domain setup)
      nextResponse.headers.set("set-cookie", setCookieHeader);
      if (debug) console.info("✅ Using backend cookie clearing headers");
    }

    return nextResponse;
  } catch (error) {
    console.error("Logout API error:", error);
    const resp = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    resp.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    resp.headers.set("Pragma", "no-cache");
    resp.headers.set("Expires", "0");
    return resp;
  }
}
