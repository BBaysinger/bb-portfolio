import { NextRequest } from "next/server";

// Proxy POST /api/contact to the backend and always return JSON
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
        ? "http://backend-dev:3001"
        : normalizedProfile === "prod"
          ? "http://backend-prod:3001"
          : "";
    const backendUrl =
      preferred || serviceDnsFallback || "http://localhost:3001";

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
