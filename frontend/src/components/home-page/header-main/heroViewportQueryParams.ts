type QueryParamValue = string | number | boolean;

// Shared parser for the current home-hero viewport investigation.
// Keep this surface intentionally small: `vhStrategy` and `vhDebug` only.
export type HeroViewportHeightStrategy = "default" | "locked";

export const HERO_VIEWPORT_DEBUG_QUERY_PARAMS = {
  strategy: "vhStrategy",
  debug: "vhDebug",
} as const;

export type HeroViewportQueryParams = Partial<
  Record<
    (typeof HERO_VIEWPORT_DEBUG_QUERY_PARAMS)[keyof typeof HERO_VIEWPORT_DEBUG_QUERY_PARAMS],
    QueryParamValue
  >
>;

export const parseBooleanViewportParam = (
  value?: QueryParamValue,
): boolean | null => {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  return null;
};

export const parseViewportHeightStrategyParam = (
  value?: QueryParamValue,
): HeroViewportHeightStrategy | null => {
  if (value === undefined) return null;

  const normalized = String(value).trim().toLowerCase();

  if (normalized === "locked") {
    return "locked";
  }

  if (normalized === "default") {
    return "default";
  }

  return null;
};

export const readViewportDebugQueryParam = (
  queryParams: HeroViewportQueryParams,
): boolean =>
  parseBooleanViewportParam(
    queryParams[HERO_VIEWPORT_DEBUG_QUERY_PARAMS.debug],
  ) ?? false;

export const readViewportHeightStrategyQueryParam = (
  queryParams: HeroViewportQueryParams,
): HeroViewportHeightStrategy | null =>
  parseViewportHeightStrategyParam(
    queryParams[HERO_VIEWPORT_DEBUG_QUERY_PARAMS.strategy],
  );
