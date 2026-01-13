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
 */

import { useEffect } from "react";

import useQueryParams from "@/hooks/useQueryParams";

type Props = {
  onUpdate: (value: boolean) => void;
  onFpsOverride?: (value: boolean | null) => void;
};

type QueryParamValue = string | number | boolean;

const parseBooleanParam = (value?: QueryParamValue): boolean | null => {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "on", "yes"].includes(normalized)) return true;
  if (["0", "false", "off", "no"].includes(normalized)) return false;
  return null;
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

  const slingerTracking = parseBooleanParam(slingerTrackingParam) ?? false;
  const fpsOverride = parseBooleanParam(fpsParam);

  useEffect(() => {
    onUpdate(slingerTracking);
  }, [slingerTracking, onUpdate]);

  useEffect(() => {
    if (!onFpsOverride) return;
    onFpsOverride(fpsOverride);
  }, [fpsOverride, onFpsOverride]);

  return null;
}
