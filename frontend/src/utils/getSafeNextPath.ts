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

  return value;
}
