import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // evaluate auth per request
export const revalidate = 0;

function resolveBackendBase(): string {
  const rawProfile = (
    process.env.ENV_PROFILE || process.env.NODE_ENV || ""
  ).toLowerCase();
  const profile = rawProfile.startsWith("prod")
    ? "prod"
    : rawProfile === "development" || rawProfile.startsWith("dev")
      ? "dev"
      : rawProfile.startsWith("local")
        ? "local"
        : rawProfile;
  const prefix = profile ? `${profile.toUpperCase()}_` : "";
  const envName = `${prefix}BACKEND_INTERNAL_URL`;
  const fromEnv = process.env[envName];
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Compose service DNS fallbacks by profile
  if (profile === "prod") return "http://bb-portfolio-backend-prod:3000";
  if (profile === "dev") return "http://bb-portfolio-backend-dev:3000";
  if (profile === "local") return "http://bb-backend-local:3001";
  return "http://bb-portfolio-backend-prod:3000"; // safe default
}

function buildTargetUrl(req: NextRequest): string {
  const base = resolveBackendBase();
  const search = req.nextUrl.search || "";
  // Match Payload REST path and allow query params passthrough
  return `${base}/api/projects${search}`;
}

export async function GET(req: NextRequest) {
  const url = buildTargetUrl(req);
  // Forward only needed headers; include Cookie so NDA/auth applies when the cookie is scoped to the frontend origin and proxied here.
  const headers: HeadersInit = {};
  const cookie = req.headers.get("cookie");
  if (cookie) (headers as Record<string, string>)["cookie"] = cookie;

  // No caching at this proxy; caching is controlled at the caller via fetch options.
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
      "cache-control": "no-store",
    },
  });
}
