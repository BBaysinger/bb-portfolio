"use client";

/**
 * Client-only query-param configuration for the home page hero.
 *
 * Key export:
 * - `HeroQueryConfig`: reads URL query params (via `useQueryParams`) and reports
 *   derived flags back to the parent hero component.
 *
 * This is intentionally renderless so it can live inside a `Suspense` boundary
 * without affecting layout or SEO.
 *
 */

import { useEffect } from "react";

import useQueryParams from "@/hooks/useQueryParams";

type Props = {
  onUpdate: (value: boolean) => void;
  onFpsOverride?: (value: boolean | null) => void;
};

/**
 * HeroQueryConfig
 *
 * A lightweight Client Component used within the homepage Hero section to safely
 * read URL query parameters on the client side without affecting the rest of the
 * Hero's static rendering.
 *
 * Responsibilities:
 * - Parse `useSlingerTracking` and notify the parent via `onUpdate`
 * - Parse FPS override params (`fps`, `fpsCounter`, `showFps`, `showFpsCounter`)
 *   and notify the parent via `onFpsOverride`
 *
 * This component hydrates inside a `<Suspense>` boundary to avoid impacting SEO
 * while allowing client-only configuration switches for experimental behavior
 * and debugging helpers like the FPS counter toggle.
 *
 * @component
 * @param {Props} props
 * @param {(value: boolean) => void} props.onUpdate - Callback fired with the value of `useSlingerTracking`
 * @param {(value: boolean | null) => void} [props.onFpsOverride] - Callback fired when FPS override params change
 * @returns {null} This component renders nothing visibly.
 *
 * @see Hero.tsx
 * @see useQueryParams
 *
 */
export default function HeroQueryConfig({ onUpdate, onFpsOverride }: Props) {
  const queryParams = useQueryParams();

  const slingerTrackingParam = queryParams?.useSlingerTracking;
  const fpsParam =
    queryParams?.fps ??
    queryParams?.fpsCounter ??
    queryParams?.showFps ??
    queryParams?.showFpsCounter;

  const slingerTracking =
    (typeof slingerTrackingParam === "boolean"
      ? slingerTrackingParam
      : typeof slingerTrackingParam === "number"
        ? slingerTrackingParam === 1
        : String(slingerTrackingParam ?? "")
            .trim()
            .toLowerCase() === "true") || false;
  const fpsOverride =
    fpsParam === undefined
      ? null
      : typeof fpsParam === "boolean"
        ? fpsParam
        : typeof fpsParam === "number"
          ? fpsParam === 1
            ? true
            : fpsParam === 0
              ? false
              : null
          : ["1", "true", "on", "yes"].includes(
                String(fpsParam).trim().toLowerCase(),
              )
            ? true
            : ["0", "false", "off", "no"].includes(
                  String(fpsParam).trim().toLowerCase(),
                )
              ? false
              : null;
  useEffect(() => {
    onUpdate(slingerTracking);
  }, [slingerTracking, onUpdate]);

  useEffect(() => {
    if (!onFpsOverride) return;
    onFpsOverride(fpsOverride);
  }, [fpsOverride, onFpsOverride]);

  return null;
}
