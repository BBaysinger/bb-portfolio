"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";

import { setHeroInView } from "@/store/uiSlice";

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
    const heroEl = document.getElementById("hero");

    const handle = () => {
      const onHome = pathname === "/" || pathname === "/portfolio";

      if (!onHome || !heroEl) {
        if (lastBucketRef.current !== -1) {
          lastBucketRef.current = -1;
          dispatch(setHeroInView(-1));
        }
        return;
      }

      const rect = heroEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const heroHeight = rect.height;

      const top = rect.top;
      const bottom = rect.bottom;

      const visibleHeight = Math.min(bottom, vh) - Math.max(top, 0);
      const clampedHeight = Math.max(0, Math.min(visibleHeight, heroHeight));
      const percentVisible = (clampedHeight / heroHeight) * 100;

      let bucket: number;
      if (percentVisible >= 99.5) bucket = 100;
      else if (percentVisible >= 5) bucket = 5;
      else bucket = 0;

      if (bucket !== lastBucketRef.current) {
        lastBucketRef.current = bucket;
        dispatch(setHeroInView(bucket));
        // console.info(
        //   `Hero in view: ${bucket}% (actual: ${percentVisible.toFixed(2)}%)`,
        // );
      }
    };

    handle();

    window.addEventListener("scroll", handle);
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handle);

    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
    };
  }, [dispatch, pathname]);
}
