/**
 * Frontend API proxy for `GET /api/cv-experience`.
 *
 * Keeps client-side fetches same-origin while forwarding to backend.
 */
import { NextRequest } from "next/server";

import { resolveBackendBase } from "@/utils/backend-base";

export async function GET(request: NextRequest) {
  const backendUrl = resolveBackendBase();

  const response = await fetch(`${backendUrl}/api/cv-experience/`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(request.headers.get("user-agent") && {
        "User-Agent": request.headers.get("user-agent")!,
      }),
    },
    cache: "no-store",
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") || "application/json",
    },
  });
}

export async function POST() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
