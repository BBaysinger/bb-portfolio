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

/**
 * Proxies the backend contact status endpoint and normalizes output as JSON.
 *
 * @returns JSON from upstream, or `{ error: string }` on failure.
 */
export async function GET(_request: NextRequest) {
  try {
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
    const backendUrl =
      preferred || serviceDnsFallback || "http://localhost:8081";

    const upstream = await fetch(`${backendUrl}/api/contact/status/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const ct = upstream.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = await upstream.json();
      return Response.json(json, { status: upstream.status });
    }
    const text = await upstream.text();
    return Response.json(
      { error: text || `Upstream returned ${upstream.status}` },
      { status: upstream.status },
    );
  } catch (error) {
    console.error("Frontend contact status proxy error:", error);
    return Response.json(
      { error: "Failed to retrieve contact status." },
      { status: 500 },
    );
  }
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
