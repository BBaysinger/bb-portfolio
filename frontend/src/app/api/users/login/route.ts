import { NextRequest, NextResponse } from "next/server";

import { LOGIN_FAILED_MESSAGE } from "@/constants/messages";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Login API route that proxies to Payload CMS backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Resolve backend URL with environment normalization and internal preference
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
    const preferred = firstVal(`${prefix}BACKEND_INTERNAL_URL`);
    const serviceDnsFallback =
      normalizedProfile === "dev"
        ? "http://bb-portfolio-backend-dev:3000"
        : normalizedProfile === "prod"
          ? "http://bb-portfolio-backend-prod:3000"
          : normalizedProfile === "local"
            ? "http://bb-backend-local:3001"
            : "";
    const reqHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const isSameHost = (() => {
      try {
        const u = new URL(preferred);
        return !!reqHost && u.host === reqHost;
      } catch {
        return false;
      }
    })();
    const backendUrl = (() => {
      if (preferred && !isSameHost) return preferred;
      if (serviceDnsFallback) return serviceDnsFallback;
      return preferred || "http://localhost:8081";
    })();

    // Forward the request to Payload CMS backend
    const debug =
      process.env.DEBUG_API_AUTH === "1" ||
      process.env.NODE_ENV !== "production";
    if (debug) console.info("🔗 Backend URL (login):", backendUrl);
    const response = await fetch(
      `${backendUrl.replace(/\/$/, "")}/api/users/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || LOGIN_FAILED_MESSAGE },
        { status: response.status }
      );
    }

    // Create response with user data
    const nextResponse = NextResponse.json({ user: data.user });

    // Forward any authentication cookies from the backend
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      nextResponse.headers.set("set-cookie", setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
