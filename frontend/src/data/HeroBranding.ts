export type ServerHeroBranding = {
  activeRoleTitle: string;
  activeRoleLetterSpacing: string;
};

type HeroBrandingApiResponse = {
  success?: boolean;
  data?: {
    activeRoleTitle?: unknown;
    activeRoleLetterSpacing?: unknown;
  };
};

const DEFAULT_ROLE_TITLE = "Front-End / UI Developer";
const DEFAULT_LETTER_SPACING = "0.12em";
const LETTER_SPACING_TOKEN_REGEX =
  /^\s*(-?(?:\d+|\d*\.\d+))\s*(em|rem|px)\s*$/i;

const clampSpacingByUnit = (value: number, unit: "em" | "rem" | "px") => {
  if (unit === "px") return Math.max(-4, Math.min(8, value));
  return Math.max(-0.2, Math.min(0.4, value));
};

const normalizeSpacingToken = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_LETTER_SPACING;

  const match = value.match(LETTER_SPACING_TOKEN_REGEX);
  if (!match) return DEFAULT_LETTER_SPACING;

  const numeric = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase() as "em" | "rem" | "px";
  const clamped = clampSpacingByUnit(numeric, unit);
  return `${clamped}${unit}`;
};

const resolveBackendBaseUrl = () => {
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

  const preferred = process.env.BACKEND_INTERNAL_URL || "";
  const serviceDnsFallback =
    normalizedProfile === "dev"
      ? "http://bb-portfolio-backend-dev:3000"
      : normalizedProfile === "prod"
        ? "http://bb-portfolio-backend-prod:3000"
        : normalizedProfile === "local"
          ? "http://bb-portfolio-backend-local:3001"
          : "";

  return preferred || serviceDnsFallback || "http://localhost:8081";
};

export const getServerHeroBranding = async (): Promise<ServerHeroBranding> => {
  const fallback: ServerHeroBranding = {
    activeRoleTitle: DEFAULT_ROLE_TITLE,
    activeRoleLetterSpacing: DEFAULT_LETTER_SPACING,
  };

  try {
    const backendUrl = resolveBackendBaseUrl();
    const response = await fetch(`${backendUrl}/api/hero-branding/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) return fallback;

    const payload = (await response.json()) as HeroBrandingApiResponse;
    if (!payload.success || !payload.data) return fallback;

    const activeRoleTitle =
      typeof payload.data.activeRoleTitle === "string" &&
      payload.data.activeRoleTitle.trim()
        ? payload.data.activeRoleTitle.trim()
        : DEFAULT_ROLE_TITLE;

    return {
      activeRoleTitle,
      activeRoleLetterSpacing: normalizeSpacingToken(
        payload.data.activeRoleLetterSpacing,
      ),
    };
  } catch {
    return fallback;
  }
};
