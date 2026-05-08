import { defaultRoleTitle } from "@/app/siteMetadata";
import {
  DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
  isHeroRoleTitleClassName,
  type HeroRoleTitleClassName,
} from "@/data/heroRoleTitleClasses";
import { resolveBackendBase } from "@/utils/backend-base";

export type ServerBrandingLockup = {
  activeRoleTitle: string;
  activeRoleTitleClassName?: HeroRoleTitleClassName;
};

type BrandingLockupApiResponse = {
  success?: boolean;
  data?: {
    activeRoleTitle?: unknown;
    activeRoleTitleClassName?: unknown;
  };
};

const parseBrandingLockupResponse = (
  payload: unknown,
): ServerBrandingLockup => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Branding lockup response was not an object.");
  }

  const response = payload as BrandingLockupApiResponse;
  if (!response.success || !response.data) {
    throw new Error("Branding lockup response did not include data.");
  }

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

export const getServerBrandingLockup =
  async (): Promise<ServerBrandingLockup> => {
    const backendUrl = resolveBackendBase();
    const response = await fetch(`${backendUrl}/api/branding-lockup/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(
        `Branding lockup fetch failed with status ${response.status} from ${backendUrl}/api/branding-lockup/.`,
      );
    }

    return parseBrandingLockupResponse(await response.json());
  };
