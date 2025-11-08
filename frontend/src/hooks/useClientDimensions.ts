import { useState, useEffect, useCallback } from "react";

const getHeight = () =>
  typeof document !== "undefined" ? document.documentElement.clientHeight : 0;

const getWidth = () =>
  typeof document !== "undefined" ? document.documentElement.clientWidth : 0;

/**
 * useClientDimensions
 *
 * Snapshots documentElement client width/height and exposes them via JS and
 * CSS custom properties:
 * - --client-width
 * - --client-height
 *
 * When to use:
 * - Useful for JS-driven behaviors that need numeric client dimensions and for
 *   mirroring those values into CSS when newer viewport units are not viable.
 *
 * Prefer CSS viewport units when possible:
 * - 100svh / 100svw → stable (small) viewport
 * - 100dvh / 100dvw → dynamic viewport (changes with browser UI)
 * - 100lvh / 100lvw → large (max) viewport for current orientation
 * These units are often a better fit for layout sizing than custom properties.
 *
 * For fixed-aspect responsive layouts (centering + cover/contain), prefer
 * `useResponsiveScaler`, which also writes CSS vars:
 *   --responsive-scaler-width/height/offset-x/offset-y/scale
 */
const useClientDimensions = () => {
  // Start with 0 to avoid SSR crash and mismatch
  const [clientHeight, setClientHeight] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const updateClientDimensions = useCallback(() => {
    const height = getHeight();
    const width = getWidth();

    setClientHeight(height);
    setClientWidth(width);

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        "--client-height",
        `${height}px`,
      );
      document.documentElement.style.setProperty(
        "--client-width",
        `${width}px`,
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    updateClientDimensions();

    const handleResize = () => requestAnimationFrame(updateClientDimensions);

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [updateClientDimensions]);

  return { clientHeight, clientWidth };
};

export default useClientDimensions;
