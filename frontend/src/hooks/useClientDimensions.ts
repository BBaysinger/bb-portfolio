import { useState, useEffect, useCallback, useRef } from "react";

const getHeight = () =>
  typeof document !== "undefined" ? document.documentElement.clientHeight : 0;

const getWidth = () =>
  typeof document !== "undefined" ? document.documentElement.clientWidth : 0;

const isTextInputFocused = () => {
  if (typeof document === "undefined") return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return el.isContentEditable;
};

const getDynamicViewport = () => {
  if (typeof window === "undefined") {
    return { height: 0, width: 0 };
  }

  // Prefer visualViewport for the *dynamic* viewport (browser UI + keyboard).
  const vvH = window.visualViewport?.height;
  const vvW = window.visualViewport?.width;
  if (
    typeof vvH === "number" &&
    typeof vvW === "number" &&
    vvH > 0 &&
    vvW > 0
  ) {
    return { height: vvH, width: vvW };
  }

  // Fallback to layout viewport.
  return { height: getHeight(), width: getWidth() };
};

/**
 * useClientDimensions
 *
 * Snapshots documentElement client width/height and exposes them via JS and
 * CSS custom properties:
 * - --client-width
 * - --client-height (stable; min per orientation)
 * - --client-height-dynamic (raw current height)
 *
 * When to use:
 * - Useful for JS-driven behaviors that need numeric client dimensions and for
 *   mirroring those values into CSS when newer viewport units are not viable.
 *
 * Prefer CSS viewport units when possible:
 * - 100svh / 100svw → stable (small) viewport
 * - 100dvh / 100dvw → dynamic viewport (changes with browser UI)
 * - 100lvh / 100lvw → large (max) viewport for current orientation
 * These units are often a better fit for layout sizing than custom properties,
 * as long as target client browsers support them.
 */
const useClientDimensions = () => {
  // Start with 0 to avoid SSR crash and mismatch
  const [clientHeight, setClientHeight] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  // Track a "stable" viewport height (similar to CSS 100svh semantics):
  // the minimum observed height for the current orientation.
  // This prevents layout shifts in browsers (notably Firefox) where UI chrome
  // show/hide triggers viewport height changes while scrolling.
  const stableRef = useRef({
    stableHeight: 0,
    stableWidth: 0,
    isPortrait: undefined as boolean | undefined,
  });

  const updateClientDimensions = useCallback(() => {
    // Layout viewport: documentElement client size.
    // This is the value we expose via --client-height/--client-width.
    // On iOS Safari, pull-to-refresh can mutate visualViewport while leaving
    // layout viewport stable; using layout viewport here prevents the hero from
    // resizing during that gesture.
    const layoutHeight = getHeight();
    const layoutWidth = getWidth();

    // Dynamic viewport: visualViewport when available.
    const { height: dynamicHeight, width: _dynamicWidth } =
      getDynamicViewport();

    setClientHeight(layoutHeight);
    setClientWidth(layoutWidth);

    // Establish / update stable min-per-orientation height.
    const isPortrait = layoutHeight >= layoutWidth;
    const stable = stableRef.current;
    if (stable.isPortrait === undefined || stable.isPortrait !== isPortrait) {
      stable.isPortrait = isPortrait;
      stable.stableHeight = layoutHeight;
      stable.stableWidth = layoutWidth;
    } else {
      // Avoid "locking" the stable height to the on-screen keyboard.
      // If a text input is focused, viewport height can shrink dramatically;
      // we treat that as ephemeral and don't update the stable minimum.
      const focused = isTextInputFocused();
      if (!focused) {
        if (stable.stableHeight === 0) stable.stableHeight = layoutHeight;
        stable.stableHeight = Math.min(stable.stableHeight, layoutHeight);
      }
      if (stable.stableWidth === 0) stable.stableWidth = layoutWidth;
      stable.stableWidth = Math.min(stable.stableWidth, layoutWidth);
    }

    if (typeof document !== "undefined") {
      const stableHeightPx = stable.stableHeight || layoutHeight;
      const dynamicHeightPx = dynamicHeight || layoutHeight;

      document.documentElement.style.setProperty(
        "--client-height",
        `${stableHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--client-height-dynamic",
        `${dynamicHeightPx}px`,
      );
      document.documentElement.style.setProperty(
        "--client-width",
        `${layoutWidth}px`,
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let resizeRaf: number | null = null;
    const scheduleUpdate = () => {
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        updateClientDimensions();
      });
    };

    scheduleUpdate();

    const handleResize = () => scheduleUpdate();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    // Some browsers update visualViewport on scroll when UI chrome changes.
    window.visualViewport?.addEventListener("scroll", handleResize);

    return () => {
      if (resizeRaf !== null) cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, [updateClientDimensions]);

  return { clientHeight, clientWidth };
};

export default useClientDimensions;
