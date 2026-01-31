/**
 * Frontend API proxy for `GET /api/health`.
 *
 * Purpose:
 * - Provides a stable frontend-origin health endpoint.
 * - Proxies to the backend health route so browser/ops checks work without
 *   needing frontend rewrites.
 *
 * Notes:
 * - Marked `force-dynamic` with `revalidate = 0` so it is never cached.
 * - Uses `cache: "no-store"` to avoid stale health reporting.
 */
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  if (profile === "prod") return "http://bb-portfolio-backend-prod:3000";
  if (profile === "dev") return "http://bb-portfolio-backend-dev:3000";
  if (profile === "local") return "http://bb-portfolio-backend-local:3001";

  return "http://bb-portfolio-backend-prod:3000";
}

export async function GET(req: NextRequest) {
  const base = resolveBackendBase();
  const url = `${base}/api/health/`;

  const headers: HeadersInit = {};
  const cookie = req.headers.get("cookie");
  if (cookie) (headers as Record<string, string>)["cookie"] = cookie;

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
      "cache-control": "no-store, no-cache, must-revalidate, private",
      pragma: "no-cache",
      expires: "0",
    },
  });
}
