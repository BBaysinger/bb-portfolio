/**
 * Selects the appropriate brand logo URL for the current theme and NDA status.
 * - If brandIsNda is true, returns null (no logo exposure).
 * - Prefer dark variant on dark background sites, then light, then legacy by slug.
 */
export function getBrandLogoUrl(opts: {
  brandId: string;
  brandIsNda?: boolean;
  lightUrl?: string;
  darkUrl?: string;
  preferDark?: boolean; // default true for current dark-only site
}): string | null {
  const { brandId, brandIsNda, lightUrl, darkUrl, preferDark = true } = opts;
  if (brandIsNda) return null;
  if (preferDark)
    return darkUrl || lightUrl || `/images/brand-logos/${brandId}.svg`;
  return lightUrl || darkUrl || `/images/brand-logos/${brandId}.svg`;
}

export default getBrandLogoUrl;
