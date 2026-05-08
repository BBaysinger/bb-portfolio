/**
 * Frontend API proxy for `GET /api/contact-info`.
 *
 * Purpose:
 * - Provides a stable frontend-origin URL for retrieving public contact info.
 * - Resolves the backend base URL based on environment, then forwards the request.
 *
 * Notes:
 * - This endpoint returns obfuscated contact fields (e.g., base64 parts) from the backend.
 * - Always returns JSON to callers.
 * - Forwards `user-agent` when present.
 *
 * Environment:
 * - `BACKEND_INTERNAL_URL` (preferred)
 * - `ENV_PROFILE` / `NODE_ENV` (used to pick a Docker service DNS fallback)
 */
import { NextRequest } from "next/server";

import { resolveBackendBase } from "@/utils/backend-base";

/**
 * Proxies the backend contact-info endpoint and returns the JSON response.
 *
 * @returns The upstream response body and status without rewriting failures.
 */
export async function GET(request: NextRequest) {
  const backendUrl = resolveBackendBase();

  const response = await fetch(`${backendUrl}/api/contact-info/`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(request.headers.get("user-agent") && {
        "User-Agent": request.headers.get("user-agent")!,
      }),
    },
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json",
    },
  });
}

// Handle unsupported methods
export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
