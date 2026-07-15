import {
  isHeroRoleTitleClassName,
  type HeroRoleTitleClassName,
} from "@/data/heroRoleTitleClasses";
import { resolveBackendBase } from "@/utils/backend-base";

import { BRANDING_CACHE_TAG } from "./cacheTags";
import {
  requireResponseData,
  requireTrimmedString,
} from "./responseValidation";
import { loadStaticContentSnapshot } from "./StaticContentSnapshot";

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

  if (!isHeroRoleTitleClassName(data?.activeRoleTitleClassName)) {
    throw new Error("Response missing activeRoleTitleClassName.");
  }

  return {
    activeRoleTitle: requireTrimmedString(
      data?.activeRoleTitle,
      "activeRoleTitle",
    ),
    activeRoleTitleClassName: data.activeRoleTitleClassName,
  };
};

export const getServerBrandingLockup =
  async (): Promise<ServerBrandingLockup> => {
    const snapshot = await loadStaticContentSnapshot();
    if (snapshot?.brandingLockup) {
      return parseBrandingLockupResponse({
        success: true,
        data: snapshot.brandingLockup,
      });
    }

    const backendUrl = resolveBackendBase();
    const response = await fetch(`${backendUrl}/api/branding-lockup/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 86400, tags: [BRANDING_CACHE_TAG] },
    });

    if (!response.ok) {
      throw new Error(
        `Branding lockup fetch failed with status ${response.status} from ${backendUrl}/api/branding-lockup/.`,
      );
    }

    return parseBrandingLockupResponse(await response.json());
  };
