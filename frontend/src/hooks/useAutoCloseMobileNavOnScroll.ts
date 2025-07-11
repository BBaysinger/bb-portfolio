import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { expandMobileNav } from "@/store/uiSlice";
import type { RootState } from "@/store/store";

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export function useAutoCloseMobileNavOnScroll() {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );
  const dispatch = useDispatch();

  useEffect(() => {
    const handle = () => {
      if (isMenuOpen) dispatch(expandMobileNav());
    };

    window.addEventListener("scroll", handle);
    window.addEventListener("resize", handle);

    return () => {
      window.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [isMenuOpen, dispatch]);
}
