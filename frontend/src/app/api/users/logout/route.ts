import { NextRequest, NextResponse } from "next/server";

/**
 * Logout API route that proxies to Payload CMS backend
 */
export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

    // Forward cookies from the request to maintain session
    const cookieHeader = request.headers.get("cookie") || "";

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
        { status: response.status }
      );
    }

    // Create successful response
    const nextResponse = NextResponse.json({ message: "Logged out successfully" });

    // Clear any authentication cookies
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      nextResponse.headers.set("set-cookie", setCookieHeader);
    }

    return nextResponse;
  } catch (error) {
    console.error("Logout API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}