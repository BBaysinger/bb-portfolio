import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const isLocalProfile = (): boolean => {
  const profile = (process.env.ENV_PROFILE || "").trim().toLowerCase();
  return profile === "" || profile === "local";
};

const getTokenFromRequest = (req: NextRequest): string => {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return (
    req.headers.get("x-revalidate-token") ||
    req.nextUrl.searchParams.get("token") ||
    ""
  ).trim();
};

const revalidateSiteRoutes = () => {
  revalidatePath("/.well-known/security.txt");
};

export async function POST(req: NextRequest) {
  const expected = (
    process.env.FRONTEND_SITE_REVALIDATE_SECRET ||
    process.env.FRONTEND_PROJECTS_REVALIDATE_SECRET ||
    ""
  ).trim();

  if (!expected) {
    if (isLocalProfile()) {
      revalidateSiteRoutes();

      return NextResponse.json({
        ok: true,
        revalidated: ["/.well-known/security.txt"],
        at: new Date().toISOString(),
        authMode: "local-no-secret",
      });
    }

    return NextResponse.json(
      {
        error:
          "FRONTEND_SITE_REVALIDATE_SECRET or FRONTEND_PROJECTS_REVALIDATE_SECRET is not configured.",
      },
      { status: 500 },
    );
  }

  const provided = getTokenFromRequest(req);
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidateSiteRoutes();

  return NextResponse.json({
    ok: true,
    revalidated: ["/.well-known/security.txt"],
    at: new Date().toISOString(),
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
