"use client";

import { useState } from "react";
import { useRouteChange } from "./useRouteChange";

/**
 * A client-side hook that tracks a specific segment of the pathname, updating
 * whenever the route changes (even via pushState).
 *
 * This is useful for dynamic route segments like `[slug]` or `[id]` in the Next.js App Router.
 *
 * @example
 * ```tsx
 * const projectId = useDynamicPathParam(2, initialProjectId);
 * ```
 *
 * @param segmentIndex - The index of the pathname segment to track (e.g. `-1` for last).
 * @param initialValue - The initial value to use for SSR/SSG hydration.
 * @returns The current value of the path segment.
 */
export function useDynamicPathParam(
  segmentIndex: number,
  initialValue: string,
): string {
  const [value, setValue] = useState(initialValue);

  useRouteChange((pathname) => {
    const segments = pathname.split("/").filter(Boolean);
    const newValue = segments.at(segmentIndex);
    if (newValue && newValue !== value) {
      setValue(newValue);
    }
  });

  return value;
}
