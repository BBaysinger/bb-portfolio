import { NextRequest, NextResponse } from "next/server";

/**
 * User "me" API route that proxies to Payload CMS backend to get current user info
 */
export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

    // Forward cookies from the request to maintain session
    const cookieHeader = request.headers.get("cookie") || "";

    const response = await fetch(`${backendUrl}/api/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // User not authenticated
      return NextResponse.json(
        { error: data.message || "Not authenticated" },
        { status: response.status }
      );
    }

    // Return user data
    return NextResponse.json({ user: data.user || data });
  } catch (error) {
    console.error("User me API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}