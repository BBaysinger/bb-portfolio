import { NextRequest } from "next/server";

/**
 * Frontend API route that proxies contact info requests to the backend
 * This route handles the frontend -> backend communication
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
    const prefix = normalizedProfile
      ? `${normalizedProfile.toUpperCase()}_`
      : "";
    const firstVal = (...names: string[]) => {
      for (const n of names) {
        const v = process.env[n];
        if (v) return v;
      }
      return "";
    };
    const preferred = firstVal(
      `${prefix}BACKEND_INTERNAL_URL`,
      `${prefix}NEXT_PUBLIC_BACKEND_URL`,
      "NEXT_PUBLIC_BACKEND_URL",
    );
    const serviceDnsFallback =
      normalizedProfile === "dev"
        ? "http://bb-portfolio-backend-dev:3000"
        : normalizedProfile === "prod"
          ? "http://bb-portfolio-backend-prod:3000"
          : normalizedProfile === "local"
            ? "http://bb-backend-local:3001"
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
