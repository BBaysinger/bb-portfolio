export const HERO_ROLE_TITLE_CLASS_OPTIONS = [
  {
    value: "UIDev",
    label: "UIDev",
    letterSpacing: "0.171em",
  },
  {
    value: "FEDev",
    label: "FEDev",
    letterSpacing: "0.12em",
  },
  {
    value: "FEUIDev",
    label: "FEUIDev",
    letterSpacing: "0.158em",
  },
] as const;

export type HeroRoleTitleClassName =
  (typeof HERO_ROLE_TITLE_CLASS_OPTIONS)[number]["value"];

export const DEFAULT_HERO_ROLE_TITLE_CLASS_NAME: HeroRoleTitleClassName =
  "FEUIDev";

const heroRoleTitleClassNameSet = new Set<string>(
  HERO_ROLE_TITLE_CLASS_OPTIONS.map((option) => option.value),
);

export const isHeroRoleTitleClassName = (
  value: unknown,
): value is HeroRoleTitleClassName =>
  typeof value === "string" && heroRoleTitleClassNameSet.has(value);

export const HERO_ROLE_TITLE_CLASS_TO_LETTER_SPACING: Record<
  HeroRoleTitleClassName,
  string
> = Object.fromEntries(
  HERO_ROLE_TITLE_CLASS_OPTIONS.map((option) => [
    option.value,
    option.letterSpacing,
  ]),
) as Record<HeroRoleTitleClassName, string>;
