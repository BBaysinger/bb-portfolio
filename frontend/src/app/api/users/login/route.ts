import { NextRequest, NextResponse } from "next/server";

/**
 * Login API route that proxies to Payload CMS backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8081";

    // Forward the request to Payload CMS backend
    const response = await fetch(`${backendUrl}/api/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Login failed" },
        { status: response.status },
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
      { status: 500 },
    );
  }
}
