import clsx from "clsx";

/**
 * Standardizes and simplifies class name injection in reusable component libraries
 * to ensure specificity, modularity, predictable overrides, and global fallback support.
 *
 * Designed to accept styles from multiple layers of nested components (typically CSS Modules forwarded via props),
 * this utility enables consistent and maintainable styling across deeply composed UI elements.
 *
 * This function:
 * 1. Searches each provided style source (typically CSS module objects) for a class matching `baseClassName`.
 * 2. Collects all matching class names (if found) from those sources.
 * 3. If a `prefix` is provided, it adds a global fallback class name using that prefix,
 *    constructed as `${prefix}${baseClassName}` with the first letter lowercased (e.g., "bb-layeredCarouselManager").
 * 4. Returns a space-separated string of all matched class names with duplicates removed,
 *    ensuring a clean and reliable className output for JSX.
 *
 * This allows for:
 * - Coexistence of scoped CSS Modules and global styling conventions
 * - Easy theming and override patterns (e.g., `.bb-component` as a fallback or override)
 * - Consistent styling behavior across deeply nested or wrapped components
 * - Improved DX when authoring flexible, portable UI components
 *
 * Example:
 * ```ts
 * const className = resolveClass("MyComponent", "bb-", styles1, styles2);
 * // Might return: "abc123 def456 bb-myComponent"
 * ```
 *
 * @param baseClassName - The key to look for in each style object (e.g., "MyComponent").
 * @param prefix - Optional prefix for generating a global fallback class name (e.g., "bb-").
 * @param styleSources - Any number of style objects (CSS modules) to search for the class name.
 * @returns A space-separated string of resolved class names with optional global fallback.
 *
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
