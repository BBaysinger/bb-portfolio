export const LANDING_R_COOKIE = "bb_landing_r";

export function normalizeLandingR(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(trimmed)) return undefined;

  return trimmed;
}
