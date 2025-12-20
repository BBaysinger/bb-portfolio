/**
 * Returns a safe internal redirect path based on a user-controlled `next` value.
 *
 * Rules:
 * - Must be a same-origin path (start with '/'; not '//')
 * - Must not point back to the login page (avoid redirect loops)
 */
export function getSafeNextPath(
  next: string | null | undefined,
): string | null {
  if (!next) return null;

  const value = next.trim();
  if (!value) return null;

  // Only allow internal, same-origin paths.
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;

  // Avoid loops back into login.
  if (
    value === "/login" ||
    value === "/login/" ||
    value.startsWith("/login?")
  ) {
    return null;
  }

  // Normalize known dynamic routes to their canonical trailing-slash form.
  return normalizeCanonicalTrailingSlash(value);
}

function normalizeCanonicalTrailingSlash(path: string): string {
  // Preserve query/hash.
  const q = path.indexOf("?");
  const h = path.indexOf("#");
  const cut = q === -1 ? h : h === -1 ? q : Math.min(q, h);
  const base = cut === -1 ? path : path.slice(0, cut);
  const suffix = cut === -1 ? "" : path.slice(cut);

  // Only normalize exact dynamic-detail routes.
  if (/^\/nda\/[^/]+$/.test(base)) return `${base}/${suffix}`;
  if (/^\/project\/[^/]+$/.test(base)) return `${base}/${suffix}`;

  return path;
}
