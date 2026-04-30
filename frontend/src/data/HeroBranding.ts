import { defaultRoleTitle } from "@/app/siteMetadata";
import {
  DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
  isHeroRoleTitleClassName,
  type HeroRoleTitleClassName,
} from "@/data/heroRoleTitleClasses";
import { resolveBackendBase } from "@/utils/backend-base";

export type ServerHeroBranding = {
  activeRoleTitle: string;
  activeRoleTitleClassName?: HeroRoleTitleClassName;
};

type HeroBrandingApiResponse = {
  success?: boolean;
  data?: {
    activeRoleTitle?: unknown;
    activeRoleTitleClassName?: unknown;
  };
};

const getFallbackHeroBranding = (): ServerHeroBranding => ({
  activeRoleTitle: defaultRoleTitle,
  activeRoleTitleClassName: DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
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
    activeRoleTitleClassName: isHeroRoleTitleClassName(
      response.data.activeRoleTitleClassName,
    )
      ? response.data.activeRoleTitleClassName
      : DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
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
