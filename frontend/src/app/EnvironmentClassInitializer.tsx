"use client";

/**
 * Client-only initializer that attaches environment classes to `document.documentElement`.
 *
 * Kept as a separate component so server components (like the root layout) can include it
 * without becoming client components.
 */

import { useEnvironmentClasses } from "@/hooks/useEnvironmentClasses";

export function EnvironmentClassInitializer() {
  useEnvironmentClasses();
  return null;
}
