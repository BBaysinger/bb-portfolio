import { defaultRoleTitle } from "@/app/siteMetadata";
import { resolveBackendBase } from "@/utils/backend-base";

export type ServerHeroBranding = {
  activeRoleTitle: string;
  activeRoleLetterSpacing?: string;
};

type HeroBrandingApiResponse = {
  success?: boolean;
  data?: {
    activeRoleTitle?: unknown;
    activeRoleLetterSpacing?: unknown;
  };
};

const LETTER_SPACING_TOKEN_REGEX =
  /^\s*(-?(?:\d+|\d*\.\d+))\s*(em|rem|px)?\s*$/i;

const clampSpacingByUnit = (value: number, unit: "em" | "rem" | "px") => {
  if (unit === "px") return Math.max(-4, Math.min(8, value));
  return Math.max(-0.2, Math.min(0.4, value));
};

const normalizeSpacingToken = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;

  const match = value.match(LETTER_SPACING_TOKEN_REGEX);
  if (!match) return undefined;

  const numeric = Number.parseFloat(match[1]);
  const unit = (match[2]?.toLowerCase() ?? "em") as "em" | "rem" | "px";
  const clamped = clampSpacingByUnit(numeric, unit);
  return `${clamped}${unit}`;
};

const getFallbackHeroBranding = (): ServerHeroBranding => ({
  activeRoleTitle: defaultRoleTitle,
});

const parseHeroBrandingResponse = (payload: unknown): ServerHeroBranding => {
  const fallback = getFallbackHeroBranding();

  if (!payload || typeof payload !== "object") return fallback;

  const response = payload as HeroBrandingApiResponse;
  if (!response.success || !response.data) return fallback;

  const activeRoleTitle =
    typeof response.data.activeRoleTitle === "string" &&
    response.data.activeRoleTitle.trim()
      ? response.data.activeRoleTitle.trim()
      : defaultRoleTitle;

  return {
    activeRoleTitle,
    activeRoleLetterSpacing: normalizeSpacingToken(
      response.data.activeRoleLetterSpacing,
    ),
  };
};

export const getServerHeroBranding = async (): Promise<ServerHeroBranding> => {
  const fallback = getFallbackHeroBranding();

  try {
    const backendUrl = resolveBackendBase();
    const response = await fetch(`${backendUrl}/api/hero-branding/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) return fallback;

    return parseHeroBrandingResponse(await response.json());
  } catch {
    return fallback;
  }
};
