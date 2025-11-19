"use client";

import { useEffect, useState } from "react";

/**
 * useDeviceCapabilities
 *
 * Capability-first environment detection based on pointer + hover media queries
 * and touch metrics — avoids brittle user-agent or width heuristics.
 *
 * Prefer these booleans over generic "isDesktop" / "isMobile" labels.
 * They describe actual interaction capabilities rather than assumed device classes.
 *
 * Derived flags:
 * - isDesktopLike: fine pointer + hover support
 * - isTouchPrimary: primary interaction is coarse / no hover
 * - isHybrid: device exposes both fine and coarse (e.g. touchscreen laptops)
 * - canHover: any pointer can hover ("any-hover: hover")
 * - hasFinePointer: any pointer is fine ("any-pointer: fine")
 * - hasCoarsePointer: any pointer is coarse ("any-pointer: coarse")
 * - maxTouchPoints: navigator.maxTouchPoints value (0 if unavailable)
 */
export interface DeviceCapabilities {
  fine: boolean;
  coarse: boolean;
  hover: boolean;
  anyHover: boolean;
  anyFine: boolean;
  anyCoarse: boolean;
  maxTouchPoints: number;
  isDesktopLike: boolean;
  isTouchPrimary: boolean;
  isHybrid: boolean;
  canHover: boolean;
  hasFinePointer: boolean;
  hasCoarsePointer: boolean;
}

const initial: DeviceCapabilities = {
  fine: false,
  coarse: false,
  hover: false,
  anyHover: false,
  anyFine: false,
  anyCoarse: false,
  maxTouchPoints: 0,
  isDesktopLike: false,
  isTouchPrimary: false,
  isHybrid: false,
  canHover: false,
  hasFinePointer: false,
  hasCoarsePointer: false,
};

function measure(): DeviceCapabilities {
  if (typeof window === "undefined") return initial;
  const mm = (q: string) => window.matchMedia(q).matches;
  const fine = mm("(pointer: fine)");
  const coarse = mm("(pointer: coarse)");
  const hover = mm("(hover: hover)");
  const anyHover = mm("(any-hover: hover)");
  const anyFine = mm("(any-pointer: fine)");
  const anyCoarse = mm("(any-pointer: coarse)");
  const maxTouchPoints =
    typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;

  const isDesktopLike = fine && hover; // classic mouse/trackpad
  const isTouchPrimary = (coarse || maxTouchPoints > 0) && !hover; // touch-first (phones/tablets)
  const isHybrid = fine && (coarse || maxTouchPoints > 0); // touchscreen laptop / convertible
  const canHover = anyHover;
  const hasFinePointer = anyFine;
  const hasCoarsePointer = anyCoarse;

  return {
    fine,
    coarse,
    hover,
    anyHover,
    anyFine,
    anyCoarse,
    maxTouchPoints,
    isDesktopLike,
    isTouchPrimary,
    isHybrid,
    canHover,
    hasFinePointer,
    hasCoarsePointer,
  };
}

export default function useDeviceCapabilities(): DeviceCapabilities {
  const [caps, setCaps] = useState<DeviceCapabilities>(initial);

  useEffect(() => {
    // Initial measure after mount (avoids SSR mismatch)
    setCaps(measure());
    // Re-evaluate on resize and orientation change (pointer/hover rarely change, but viewport class may)
    const onChange = () => setCaps(measure());
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  return caps;
}

/**
 * Example usage:
 * const { isDesktopLike, isTouchPrimary, isHybrid } = useDeviceCapabilities();
 * const instruction = isTouchPrimary ? "Touch and drag" : "Click and drag";
 */
