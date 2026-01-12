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

/**
 * Proxies the backend contact-info endpoint and returns the JSON response.
 *
 * @returns JSON from upstream, or `{ success: false, error: string }` on failure.
 */
export async function GET(request: NextRequest) {
  try {
    // Resolve backend URL using the same pattern as other frontend API routes
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

    // Forward the request to the backend
    const response = await fetch(`${backendUrl}/api/contact-info/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // Forward any relevant headers from the original request
        ...(request.headers.get("user-agent") && {
          "User-Agent": request.headers.get("user-agent")!,
        }),
      },
    });

    // Return the backend response as-is
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Frontend contact-info proxy error:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch contact information",
      },
      { status: 500 },
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
