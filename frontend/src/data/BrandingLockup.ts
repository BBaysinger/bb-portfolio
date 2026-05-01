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
  greetingIntroHtml: string;
  greetingBodyHtml: string;
};

type BrandingLockupApiResponse = {
  success?: boolean;
  data?: {
    activeRoleTitle?: unknown;
    activeRoleTitleClassName?: unknown;
    greetingIntroHtml?: unknown;
    greetingBodyHtml?: unknown;
  };
};

const defaultGreetingIntroHtml = `<p>Hi, I'm Bradley — a <strong>UI</strong> and <strong>front-end developer</strong> in Spokane, WA. I specialize in building polished, custom interfaces with a strong emphasis on interaction, behavior, and detail.</p>`;

const defaultGreetingBodyHtml = `<p>I build <strong>front-end systems</strong> for <strong>reliable, polished product UI</strong> — with a focus on structure, styling, behavior, and interaction. This portfolio combines recent projects with selected earlier work to show range, continuity, and the <strong>creative/technical foundation</strong> behind my current direction.</p><p>I'm currently available for <strong>freelance, contract, and production support</strong> where polished front-end execution is needed.</p>`;

const getFallbackBrandingLockup = (): ServerBrandingLockup => ({
  activeRoleTitle: defaultRoleTitle,
  activeRoleTitleClassName: DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
  greetingIntroHtml: defaultGreetingIntroHtml,
  greetingBodyHtml: defaultGreetingBodyHtml,
});

const parseBrandingLockupResponse = (
  payload: unknown,
): ServerBrandingLockup => {
  const fallback = getFallbackBrandingLockup();

  if (!payload || typeof payload !== "object") return fallback;

  const response = payload as BrandingLockupApiResponse;
  if (!response.success || !response.data) return fallback;

  const activeRoleTitle =
    typeof response.data.activeRoleTitle === "string" &&
    response.data.activeRoleTitle.trim()
      ? response.data.activeRoleTitle.trim()
      : defaultRoleTitle;
  const greetingIntroHtml =
    typeof response.data.greetingIntroHtml === "string" &&
    response.data.greetingIntroHtml.trim()
      ? response.data.greetingIntroHtml.trim()
      : defaultGreetingIntroHtml;
  const greetingBodyHtml =
    typeof response.data.greetingBodyHtml === "string" &&
    response.data.greetingBodyHtml.trim()
      ? response.data.greetingBodyHtml.trim()
      : defaultGreetingBodyHtml;

  return {
    activeRoleTitle,
    activeRoleTitleClassName: isHeroRoleTitleClassName(
      response.data.activeRoleTitleClassName,
    )
      ? response.data.activeRoleTitleClassName
      : DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
    greetingIntroHtml,
    greetingBodyHtml,
  };
};

export const getServerBrandingLockup =
  async (): Promise<ServerBrandingLockup> => {
    const fallback = getFallbackBrandingLockup();

    try {
      const backendUrl = resolveBackendBase();
      const response = await fetch(`${backendUrl}/api/branding-lockup/`, {
        method: "GET",
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      });

      if (!response.ok) return fallback;

      return parseBrandingLockupResponse(await response.json());
    } catch {
      return fallback;
    }
  };
