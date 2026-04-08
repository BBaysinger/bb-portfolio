/**
 * Frontend API proxy for `GET /api/hero-branding`.
 *
 * Keeps client-side fetches same-origin while forwarding to backend.
 */
import { NextRequest } from "next/server";

import { resolveBackendBase } from "@/utils/backend-base";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = resolveBackendBase();

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
