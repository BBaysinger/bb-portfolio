"use client";
import { useEffect, useState } from "react";

/**
 * useHasHover
 * Returns true if the device supports hover (mouse, trackpad), false otherwise (touch-only).
 * Dynamically updates if device capability changes (e.g., mouse plugged/unplugged).
 */
export function useHasHover(): boolean {
  const [hasHover, setHasHover] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(hover: hover)").matches
      : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover)");
    const handler = (event: MediaQueryListEvent) => {
      setHasHover(event.matches);
    };
    mq.addEventListener("change", handler);
    setHasHover(mq.matches);
    return () => {
      mq.removeEventListener("change", handler);
    };
  }, []);

  return hasHover;
}
