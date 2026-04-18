/**
 * Frontend API proxy for `GET /api/brands`.
 *
 * Purpose:
 * - Provides a stable frontend-origin URL for brand labels/logos.
 * - Forwards cookies to backend so NDA-aware access rules apply.
 *
 * Caching:
 * - `force-dynamic` + `no-store` to avoid mixing auth states.
 */
import type { NextRequest } from "next/server";

import { resolveBackendBase } from "@/utils/backend-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildTargetUrl(req: NextRequest): string {
  const base = resolveBackendBase();
  const search = req.nextUrl.search || "";
  return `${base}/api/brands${search}`;
}

export async function GET(req: NextRequest) {
  const url = buildTargetUrl(req);
  const headers: HeadersInit = {};
  const cookie = req.headers.get("cookie");
  const token = req.cookies.get("payload-token")?.value;
  if (cookie) (headers as Record<string, string>)["cookie"] = cookie;
  if (token)
    (headers as Record<string, string>)["authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
      "cache-control": "no-store, no-cache, must-revalidate, private",
      pragma: "no-cache",
      expires: "0",
    },
  });
}
