import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import { setHeroInView } from "store/uiSlice";

export function useGlobalScrollManager() {
  const dispatch = useDispatch();
  const location = useLocation();
  const lastValueRef = useRef<boolean | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const isAtTop = window.scrollY < 20;
      const onHome = location.pathname === "/";
      const nextValue = isAtTop && onHome;

      if (nextValue !== lastValueRef.current) {
        lastValueRef.current = nextValue;
        dispatch(setHeroInView(nextValue));
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [dispatch, location.pathname]);
}
