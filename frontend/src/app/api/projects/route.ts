/**
 * Frontend API proxy for `GET /api/projects`.
 *
 * Purpose:
 * - Provides a stable frontend-origin URL for the project dataset.
 * - Forwards cookies to the backend so authenticated/NDA-aware responses can be evaluated
 *   per-request without exposing the backend directly to the browser.
 *
 * Rendering/caching:
 * - Marked `force-dynamic` with `revalidate = 0` so auth is evaluated per request.
 * - This proxy itself uses `cache: "no-store"`; callers decide any higher-level caching.
 *
 * Environment:
 * - `BACKEND_INTERNAL_URL` (preferred)
 * - `ENV_PROFILE` / `NODE_ENV` (used to pick a Docker service DNS fallback)
 */
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // evaluate auth per request
export const revalidate = 0;

/**
 * Resolves the backend base URL for the current environment.
 */
function resolveBackendBase(): string {
  const rawProfile = (
    process.env.ENV_PROFILE ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();
  const profile = rawProfile.startsWith("prod")
    ? "prod"
    : rawProfile === "development" || rawProfile.startsWith("dev")
      ? "dev"
      : rawProfile.startsWith("local")
        ? "local"
        : rawProfile;
  const fromEnv = process.env.BACKEND_INTERNAL_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Compose service DNS fallbacks by profile
  if (profile === "prod") return "http://bb-portfolio-backend-prod:3000";
  if (profile === "dev") return "http://bb-portfolio-backend-dev:3000";
  if (profile === "local") return "http://bb-portfolio-backend-local:3001";
  return "http://bb-portfolio-backend-prod:3000"; // safe default
}

function buildTargetUrl(req: NextRequest): string {
  const base = resolveBackendBase();
  const search = req.nextUrl.search || "";
  // Match Payload REST path and allow query params passthrough
  return `${base}/api/projects${search}`;
}

/**
 * Proxies the backend projects endpoint and returns the raw JSON payload.
 *
 * @param req - Incoming request (query params are forwarded; cookies are forwarded when present).
 * @returns A Response containing the backend payload and status code.
 */
export async function GET(req: NextRequest) {
  const url = buildTargetUrl(req);
  // Forward only needed headers; include Cookie so NDA/auth applies when the cookie is scoped to the frontend origin and proxied here.
  const headers: HeadersInit = {};
  const cookie = req.headers.get("cookie");
  if (cookie) (headers as Record<string, string>)["cookie"] = cookie;

  // No caching at this proxy; caching is controlled at the caller via fetch options.
  const res = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  });
}
