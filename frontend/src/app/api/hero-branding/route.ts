/**
 * Frontend API proxy for `GET /api/hero-branding`.
 *
 * Keeps client-side fetches same-origin while forwarding to backend.
 */
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
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

    const response = await fetch(`${backendUrl}/api/hero-branding/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(request.headers.get("user-agent") && {
          "User-Agent": request.headers.get("user-agent")!,
        }),
      },
      cache: "no-store",
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("Frontend hero-branding proxy error:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch hero branding",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
