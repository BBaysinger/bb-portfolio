import { defaultRoleTitle } from "@/app/siteMetadata";
import {
  DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
  isHeroRoleTitleClassName,
  type HeroRoleTitleClassName,
} from "@/data/heroRoleTitleClasses";
import { resolveBackendBase } from "@/utils/backend-base";

import {
  requireResponseData,
  requireTrimmedString,
} from "./responseValidation";

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
  const data = requireResponseData<BrandingLockupApiResponse["data"]>(
    payload,
    "Branding lockup",
  );

  return {
    activeRoleTitle:
      typeof data?.activeRoleTitle === "string" && data.activeRoleTitle.trim()
        ? data.activeRoleTitle.trim()
        : defaultRoleTitle,
    activeRoleTitleClassName: isHeroRoleTitleClassName(
      data?.activeRoleTitleClassName,
    )
      ? data.activeRoleTitleClassName
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
