"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";

import { setHeroInView } from "@/store/uiSlice";
import { getViewportHeightPx } from "@/utils/viewport";

import { startViewportSettle } from "./viewportSettle";

/**
 * Tracks how much of the #hero element is in view and buckets it (100%, 5%, 0%).
 * Dispatches the result to Redux on scroll/resize/orientationchange.
 *
 * Only activates when on the homepage or /portfolio route
 * (those are the same page, because the portfolio list is at the bottom).
 *
 */
export function useTrackHeroInView() {
  const dispatch = useDispatch();
  const pathname = usePathname();
  const lastBucketRef = useRef<number | null>(null);

  useEffect(() => {
    const onHome = pathname === "/" || pathname === "/portfolio";
    let heroCheckRaf: number | null = null;

    const updateHeroVisibility = () => {
      const heroEl = document.getElementById("hero");

      if (!onHome || !heroEl) {
        if (lastBucketRef.current !== -1) {
          lastBucketRef.current = -1;
          dispatch(setHeroInView(-1));
        }
        return Boolean(heroEl);
      }

      const rect = heroEl.getBoundingClientRect();
      const vh = getViewportHeightPx();
      const heroHeight = rect.height;

      const top = rect.top;
      const bottom = rect.bottom;

      const visibleHeight = Math.min(bottom, vh) - Math.max(top, 0);
      const clampedHeight = Math.max(0, Math.min(visibleHeight, heroHeight));
      const percentVisible = heroHeight
        ? (clampedHeight / heroHeight) * 100
        : 0;

      let bucket: number;
      if (percentVisible >= 99.5) bucket = 100;
      else if (percentVisible >= 5) bucket = 5;
      else bucket = 0;

      if (bucket !== lastBucketRef.current) {
        lastBucketRef.current = bucket;
        dispatch(setHeroInView(bucket));
      }

      return true;
    };

    const ensureHeroPresence = () => {
      const hasHero = updateHeroVisibility();
      if (onHome && !hasHero) {
        if (heroCheckRaf === null) {
          heroCheckRaf = requestAnimationFrame(() => {
            heroCheckRaf = null;
            ensureHeroPresence();
          });
        }
      }
    };

    ensureHeroPresence();

    const handleViewportChange = () => {
      updateHeroVisibility();
    };

    const stopViewportSettle = startViewportSettle(() => {
      handleViewportChange();
    });

    const scrollListenerOptions: AddEventListenerOptions = { passive: true };

    window.addEventListener(
      "scroll",
      handleViewportChange,
      scrollListenerOptions,
    );
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      if (heroCheckRaf !== null) {
        cancelAnimationFrame(heroCheckRaf);
      }

      stopViewportSettle();
      window.removeEventListener(
        "scroll",
        handleViewportChange,
        scrollListenerOptions,
      );
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [dispatch, pathname]);
}
