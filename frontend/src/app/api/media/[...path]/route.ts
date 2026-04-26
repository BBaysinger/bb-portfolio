import type { NextRequest } from "next/server";

import { resolveBackendBase } from "@/utils/backend-base";

export const runtime = "nodejs";

function buildTargetUrl(req: NextRequest, pathParts: string[]): string {
  const base = resolveBackendBase();
  const encodedPath = pathParts
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const search = req.nextUrl.search || "";
  return `${base}/media/${encodedPath}${search}`;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathParts } = await ctx.params;
    if (!Array.isArray(pathParts) || pathParts.length === 0) {
      return new Response("Not found", { status: 404 });
    }

    const response = await fetch(buildTargetUrl(req, pathParts), {
      method: "GET",
      cache: "no-store",
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") || "application/octet-stream",
        "cache-control":
          response.headers.get("cache-control") ||
          "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Frontend media proxy error:", error);
    return new Response("Not found", { status: 404 });
  }
}
