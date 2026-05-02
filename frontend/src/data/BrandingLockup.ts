import { defaultRoleTitle } from "@/app/siteMetadata";
import {
  DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
  isHeroRoleTitleClassName,
  type HeroRoleTitleClassName,
} from "@/data/heroRoleTitleClasses";
import { renderAuthoredParagraphHtml } from "@/utils/authoredText";
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

const defaultGreetingIntroHtml = renderAuthoredParagraphHtml(
  "Hi, I'm Bradley — a **UI** and **front-end developer** in Spokane, WA. I specialize in building polished, custom interfaces with a strong emphasis on interaction, behavior, and detail.",
);

const defaultGreetingBodyHtml = [
  "I build **front-end systems** for **reliable, polished product UI** — with a focus on structure, styling, behavior, and interaction. This portfolio combines recent projects with selected earlier work to show range, continuity, and the **creative/technical foundation** behind my current direction.",
  "I'm currently available for **freelance, contract, and production support** where polished front-end execution is needed.",
]
  .map((paragraph) => renderAuthoredParagraphHtml(paragraph))
  .join("");

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
