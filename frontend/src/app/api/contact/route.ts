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

/**
 * Proxies the backend contact submission endpoint and normalizes output as JSON.
 *
 * @param request - Incoming request containing the contact submission payload.
 * @returns JSON from upstream, or `{ error: string }` on failure.
 */
export async function POST(request: NextRequest) {
  try {
    // Resolve backend URL (reuse logic consistent with other proxy routes)
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

    // Forward request body to backend
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

    const ct = upstream.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = await upstream.json();
      return Response.json(json, { status: upstream.status });
    }
    // Coerce non-JSON upstream responses (like HTML error pages) into JSON string payload
    const text = await upstream.text();
    return Response.json(
      { error: text || `Upstream returned ${upstream.status}` },
      { status: upstream.status },
    );
  } catch (error) {
    console.error("Frontend contact proxy error:", error);
    return Response.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 },
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
