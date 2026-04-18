/**
 * Frontend API proxy for `POST /api/users/login`.
 *
 * Purpose:
 * - Provides a stable frontend-origin login endpoint.
 * - Proxies credentials to the backend Payload login route.
 * - Forwards `set-cookie` back to the browser so the session is established on the frontend origin.
 *
 * Rendering/caching:
 * - Marked `force-dynamic` with `revalidate = 0` so requests are never cached.
 *
 * Environment:
 * - `BACKEND_INTERNAL_URL` (preferred)
 * - `ENV_PROFILE` / `NODE_ENV` (used to pick a Docker service DNS fallback)
 * - `DEBUG_API_AUTH` (optional; enables verbose logging)
 */
import { NextRequest, NextResponse } from "next/server";

import { LOGIN_FAILED_MESSAGE } from "@/constants/messages";
import { resolveBackendBase } from "@/utils/backend-base";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Proxies login requests to the backend and forwards auth cookies.
 *
 * @param request - Incoming request containing the login payload.
 * @returns A JSON response containing `{ user }` on success, or `{ error }` on failure.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reqHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    const backendUrl = resolveBackendBase({
      requestHost: reqHost,
      avoidRequestHost: true,
    });

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
          "x-auth-proxy": "1",
        },
        body: JSON.stringify(body),
      },
    );

    const data = (await response.json()) as {
      user?: unknown;
      token?: unknown;
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (typeof data.message === "string" && data.message) ||
            (typeof data.error === "string" && data.error) ||
            LOGIN_FAILED_MESSAGE,
        },
        { status: response.status },
      );
    }

    // Create response with user data
    const nextResponse = NextResponse.json({ user: data.user });

    const token = typeof data.token === "string" ? data.token : "";
    if (token) {
      const requestProto =
        request.headers.get("x-forwarded-proto") ||
        request.nextUrl.protocol.replace(":", "") ||
        "http";
      const secure = requestProto === "https";

      nextResponse.cookies.set({
        name: "payload-token",
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return nextResponse;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
