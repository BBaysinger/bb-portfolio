import clsx from "clsx";

/**
 * Resolves a class name from multiple style sources.
 *
 * @param baseClassName - The base class key to resolve (e.g., "layeredCarouselManager")
 * @param prefix - Optional global prefix fallback (e.g., "bb-")
 * @param styleSources - Any number of style objects (e.g., CSS modules)
 */
export function resolveClass(
  baseClassName: string,
  prefix?: string,
  ...styleSources: Array<Record<string, string> | undefined>
): string {
  const matched = styleSources
    .map((styles) => styles?.[baseClassName])
    .filter(Boolean);

  if (prefix) {
    const lowercased =
      baseClassName.charAt(0).toLowerCase() + baseClassName.slice(1);
    matched.push(`${prefix}${lowercased}`);
  }

  return clsx(...new Set(matched));
}
