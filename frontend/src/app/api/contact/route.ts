/**
 * Frontend API proxy for `POST /api/contact`.
 *
 * Purpose:
 * - Provides a stable frontend-origin URL for the contact form submission.
 * - Resolves the backend base URL based on environment, then forwards the request.
 *
 * Notes:
 * - Always returns JSON to callers (wraps non-JSON upstream responses).
 * - Forwards `content-type` and `user-agent` when present.
 *
 * Environment:
 * - `BACKEND_INTERNAL_URL` (preferred)
 * - `ENV_PROFILE` / `NODE_ENV` (used to pick a Docker service DNS fallback)
 */
import { NextRequest } from "next/server";

import { resolveBackendBase } from "@/utils/backend-base";

/**
 * Proxies the backend contact submission endpoint and normalizes output as JSON.
 *
 * @param request - Incoming request containing the contact submission payload.
 * @returns The upstream response body and status without rewriting failures.
 */
export async function POST(request: NextRequest) {
  const backendUrl = resolveBackendBase();

  const body = await request.text();
  const upstream = await fetch(`${backendUrl}/api/contact/`, {
    method: "POST",
    headers: {
      "Content-Type":
        request.headers.get("content-type") || "application/json",
      Accept: "application/json",
      ...(request.headers.get("user-agent") && {
        "User-Agent": request.headers.get("user-agent")!,
      }),
    },
    body,
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "application/json",
    },
  });
}

// Handle unsupported methods
export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
