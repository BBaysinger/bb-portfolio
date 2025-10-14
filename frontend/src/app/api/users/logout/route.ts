import { NextRequest, NextResponse } from "next/server";

/**
 * Logout API route that proxies to Payload CMS backend
 */
export async function POST(request: NextRequest) {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

    console.log("🔗 Backend URL:", backendUrl);

    // Forward cookies from the request to maintain session
    const cookieHeader = request.headers.get("cookie") || "";
    console.log("🍪 Logout API - Incoming cookies:", cookieHeader);

    const response = await fetch(`${backendUrl}/api/users/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(
        { error: data.message || "Logout failed" },
        { status: response.status },
      );
    }

    // Create successful response
    const nextResponse = NextResponse.json({
      message: "Logged out successfully",
    });

    // Forward any set-cookie headers from backend (these should clear cookies)
    const setCookieHeader = response.headers.get("set-cookie");
    console.log("🧹 Backend set-cookie header:", setCookieHeader);

    if (setCookieHeader) {
      nextResponse.headers.set("set-cookie", setCookieHeader);
      console.log("✅ Using backend cookie clearing headers");
    } else {
      // If backend didn't send cookie clearing headers, clear them manually
      // These are common Payload CMS cookie names
      console.log("🔧 Backend didn't clear cookies, doing it manually");
      nextResponse.headers.append(
        "set-cookie",
        "payload-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
      );
      nextResponse.headers.append(
        "set-cookie",
        "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
      );
    }

    return nextResponse;
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
