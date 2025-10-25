import { NextRequest, NextResponse } from "next/server";

/**
 * User "me" API route that proxies to Payload CMS backend to get current user info
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

    // Forward cookies from the request to maintain session
    const cookieHeader = request.headers.get("cookie") || "";

    // Helper to try a URL and parse JSON safely
    const tryFetch = async (url: string) => {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(cookieHeader && { Cookie: cookieHeader }),
        },
        // no-store to avoid stale auth
        cache: "no-store",
      });
      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        // ignore JSON errors, we'll handle based on status
      }
      return { res, payload } as const;
    };

    // First attempt (no trailing slash)
    let { res, payload } = await tryFetch(`${backendUrl}/api/users/me`);

    // If unauthorized, try a trailing slash variant (some proxies normalize differently)
    if (!res.ok && res.status === 401) {
      const alt = await tryFetch(`${backendUrl}/api/users/me/`);
      res = alt.res;
      payload = alt.payload;
    }

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        const cookieNames = cookieHeader
          ? cookieHeader.split(/;\s*/).map((c) => c.split("=")[0])
          : [];
        console.info("[/api/users/me] auth failed", {
          status: res.status,
          cookiePresent: Boolean(cookieHeader),
          cookieNames,
        });
      }
      // Safely derive an error message from the payload without using `any`
      const message = (() => {
        if (payload && typeof payload === "object" && "message" in payload) {
          const m = (payload as { message?: unknown }).message;
          return typeof m === "string" ? m : undefined;
        }
        return undefined;
      })();
      return NextResponse.json(
        { error: message || "Not authenticated" },
        { status: res.status }
      );
    }

    // Return user data (Payload returns either { user } or the user directly)
    // Extract `user` property if present; otherwise return the payload itself
    const user = (() => {
      if (payload && typeof payload === "object" && "user" in payload) {
        return (payload as { user?: unknown }).user;
      }
      return payload;
    })();
    return NextResponse.json({ user });
  } catch (error) {
    console.error("User me API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
