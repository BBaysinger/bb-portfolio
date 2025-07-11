import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setHeroInView } from "store/uiSlice";

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export function useTrackHeroInView() {
  const dispatch = useDispatch();
  const location = useLocation();
  const lastBucketRef = useRef<number | null>(null);

  useEffect(() => {
    const heroEl = document.getElementById("hero");

    const handle = () => {
      const onHome =
        location.pathname === "/" || location.pathname === "/portfolio";

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

      // Top and bottom boundaries of hero in viewport coordinates
      const top = rect.top;
      const bottom = rect.bottom;

      // Clamp the visible portion
      const visibleHeight = Math.min(bottom, vh) - Math.max(top, 0);
      const clampedHeight = Math.max(0, Math.min(visibleHeight, heroHeight));
      const percentVisible = (clampedHeight / heroHeight) * 100;

      let bucket: number;
      if (percentVisible >= 99.5) bucket = 100;
      // else if (percentVisible >= 95) bucket = 95;
      // else if (percentVisible >= 10) bucket = 10;
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
  }, [dispatch, location.pathname]);
}
