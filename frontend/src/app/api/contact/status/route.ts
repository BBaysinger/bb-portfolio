import { NextRequest } from "next/server";

// Proxy GET /api/contact/status to the backend and always return JSON
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
      "BACKEND_INTERNAL_URL",
    );
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
