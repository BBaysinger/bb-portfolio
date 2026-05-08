/**
 * Frontend API proxy for `GET /api/contact/status`.
 *
 * Purpose:
 * - Provides a stable frontend-origin URL for contact status checks.
 * - Resolves the backend base URL based on environment, then forwards the request.
 *
 * Notes:
 * - Uses `cache: "no-store"` to ensure status changes take effect immediately.
 * - Always returns JSON to callers (wraps non-JSON upstream responses).
 *
 * Environment:
 * - `BACKEND_INTERNAL_URL` (preferred)
 * - `ENV_PROFILE` / `NODE_ENV` (used to pick a Docker service DNS fallback)
 */
import { NextRequest } from "next/server";

import { resolveBackendBase } from "@/utils/backend-base";

/**
 * Proxies the backend contact status endpoint and normalizes output as JSON.
 *
 * @returns The upstream response body and status without rewriting failures.
 */
export async function GET(_request: NextRequest) {
  const backendUrl = resolveBackendBase();

  const upstream = await fetch(`${backendUrl}/api/contact/status/`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "application/json",
    },
  });
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
