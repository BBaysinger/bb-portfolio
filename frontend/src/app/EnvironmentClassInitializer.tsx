"use client";

/**
 * Client-only initializer that attaches environment classes to `document.documentElement`.
 *
 * This is intentionally a tiny component that only runs a hook and renders nothing.
 * Keeping it separate allows server components (like the root layout) to include it
 * without forcing the entire layout tree to become a client component.
 *
 * Key exports:
 * - `EnvironmentClassInitializer` – runs `useEnvironmentClasses()` on the client.
 *
 * @example
 * ```tsx
 * // In a server component (e.g. app/layout.tsx)
 * <EnvironmentClassInitializer />
 * ```
 *
 * Note: the actual class selection logic and any listeners/cleanup live in the hook.
 */

import { useEnvironmentClasses } from "@/hooks/useEnvironmentClasses";

/**
 * Runs `useEnvironmentClasses()` and renders nothing.
 *
 * @returns `null` (this is a side-effect-only initializer).
 */
export function EnvironmentClassInitializer() {
  useEnvironmentClasses();
  return null;
}
