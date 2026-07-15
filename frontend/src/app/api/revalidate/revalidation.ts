import { NextRequest, NextResponse } from "next/server";

type RevalidationConfig = {
  label: string;
  secretEnv: string;
  revalidate: () => string[];
};

const isLocalProfile = (): boolean => {
  const profile = (process.env.ENV_PROFILE || "").trim().toLowerCase();
  return profile === "" || profile === "local";
};

const getTokenFromRequest = (req: NextRequest): string => {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return (req.headers.get("x-revalidate-token") || "").trim();
};

export const createRevalidationHandler = (config: RevalidationConfig) => {
  return async (req: NextRequest) => {
    const expected = (
      process.env[config.secretEnv] ||
      process.env.FRONTEND_PROJECTS_REVALIDATE_SECRET ||
      ""
    ).trim();

    if (!expected && !isLocalProfile()) {
      return NextResponse.json(
        {
          error: `${config.secretEnv} or FRONTEND_PROJECTS_REVALIDATE_SECRET is not configured.`,
        },
        { status: 500 },
      );
    }

    if (expected && getTokenFromRequest(req) !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const revalidated = config.revalidate();
    return NextResponse.json({
      ok: true,
      target: config.label,
      revalidated,
      at: new Date().toISOString(),
      ...(!expected ? { authMode: "local-no-secret" } : {}),
    });
  };
};
