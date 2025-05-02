import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import { setHeroInView } from "store/uiSlice";

export function useTrackHeroInView() {
  const dispatch = useDispatch();
  const location = useLocation();
  const lastValueRef = useRef<boolean | null>(null);

  useEffect(() => {
    const handle = () => {
      const isAtTop = window.scrollY === 0;
      const onHome =
        location.pathname === "/" || location.pathname === "/portfolio";
      const nextValue = isAtTop && onHome;

      if (nextValue !== lastValueRef.current) {
        lastValueRef.current = nextValue;
        dispatch(setHeroInView(nextValue));
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

export default useTrackHeroInView;
