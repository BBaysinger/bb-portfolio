/**
 * Selects the appropriate brand logo URL for the current theme and NDA status.
 * - If brandIsNda is true, returns null (no logo exposure).
 * - Prefer dark variant on dark background sites, then light.
 * - No legacy/static fallbacks by policy — if none available, return null.
 */
export function getBrandLogoUrl(opts: {
  brandId: string;
  brandIsNda?: boolean;
  /** When true, allow NDA brand logos (e.g., on authenticated NDA routes). */
  allowNdaLogo?: boolean;
  lightUrl?: string;
  darkUrl?: string;
  preferDark?: boolean; // default true for current dark-only site
}): string | null {
  const {
    brandIsNda,
    allowNdaLogo = false,
    lightUrl,
    darkUrl,
    preferDark = true,
  } = opts;
  if (brandIsNda && !allowNdaLogo) return null;
  if (preferDark) return darkUrl || lightUrl || null;
  return lightUrl || darkUrl || null;
}

export default getBrandLogoUrl;
