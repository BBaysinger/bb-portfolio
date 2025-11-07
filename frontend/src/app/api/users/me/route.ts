import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * User "me" API route that proxies to Payload CMS backend to get current user info
 */
export async function GET(request: NextRequest) {
  try {
    // Resolve backend base URL with environment-profile normalization
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

    // Prefer INTERNAL_URL to avoid self-calling the frontend domain
    const preferred = firstVal(`${prefix}BACKEND_INTERNAL_URL`);

    // Fallback service DNS inside container networks
    const serviceDnsFallback =
      normalizedProfile === "dev"
        ? "http://bb-portfolio-backend-dev:3000"
        : normalizedProfile === "prod"
          ? "http://bb-portfolio-backend-prod:3000"
          : normalizedProfile === "local"
            ? "http://bb-portfolio-backend-local:3001"
            : "";

    // Avoid recursion: if preferred points to the same host as this request, use service DNS if available
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

    // Forward cookies from the request to maintain session
    const cookieHeader = request.headers.get("cookie") || "";

    // Helper to try a URL and parse JSON safely
    const debug =
      process.env.DEBUG_API_AUTH === "1" ||
      process.env.NODE_ENV !== "production";
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
    if (debug)
      console.info("🔗 Backend URL (me):", backendUrl, "reqHost:", reqHost);
    let { res, payload } = await tryFetch(
      `${backendUrl.replace(/\/$/, "")}/api/users/me`,
    );

    // If unauthorized, try a trailing slash variant (some proxies normalize differently)
    if (!res.ok && res.status === 401) {
      const alt = await tryFetch(
        `${backendUrl.replace(/\/$/, "")}/api/users/me/`,
      );
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
      const resp = NextResponse.json(
        { error: message || "Not authenticated" },
        { status: res.status },
      );
      // Explicitly disable caching at every layer
      resp.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private",
      );
      resp.headers.set("Pragma", "no-cache");
      resp.headers.set("Expires", "0");
      return resp;
    }

    // Return user data (Payload returns either { user } or the user directly)
    // Extract `user` property if present; otherwise return the payload itself
    const user = (() => {
      if (payload && typeof payload === "object" && "user" in payload) {
        return (payload as { user?: unknown }).user;
      }
      return payload;
    })();
    const success = NextResponse.json({ user });
    // Explicitly disable caching at every layer
    success.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    success.headers.set("Pragma", "no-cache");
    success.headers.set("Expires", "0");
    return success;
  } catch (error) {
    console.error("User me API error:", error);
    const resp = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
    // Explicitly disable caching at every layer
    resp.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    resp.headers.set("Pragma", "no-cache");
    resp.headers.set("Expires", "0");
    return resp;
  }
}
