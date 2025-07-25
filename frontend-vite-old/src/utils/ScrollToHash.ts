import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Component: ScrollToHash
 *
 * Smoothly scrolling, hash-aware React SPA component that avoids redundant scrolling,
 * works on both Chrome and Safari, and cleans up after itself.
 *
 * Automatically scrolls to an element with the ID specified in the URL hash
 * whenever the hash changes. Handles repeated clicks on the same hash by
 * programmatically resetting the hash.
 *
 * @remarks
 * Uses the `useLocation` hook to extract the hash from the current URL
 * and the `useNavigate` hook to enable programmatic navigation. When the hash changes,
 * it attempts to find a DOM element with the matching ID and scrolls to it smoothly.
 * After scrolling, it temporarily removes the hash to allow repeated clicks on the same hash.
 *
 * On mobile Safari, the browser often scrolls to the hash automatically. In Chrome
 * and other browsers, it may not. To avoid duplicate scrolling, this component compares
 * the scroll position before and after a short delay. If the scroll position has changed,
 * it also verifies whether the scroll was due to the page being shorter (i.e. clamped to bottom).
 *
 * @returns {null} This component does not render anything visible on the screen.
 *
 * @example
 * import ScrollToHash from './utils/ScrollToHash';
 *
 * function App() {
 *   return (
 *     <div>
 *       <ScrollToHash />
 *       {/* Other components *\/}
 *     </div>
 *   );
 * }
 *
 * @author Bradley Baysinger
 */
const ScrollToHash = () => {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const cleanupTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending timeout from a previous hash change
    if (cleanupTimeoutRef.current !== null) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (hash) {
      const element = document.querySelector(hash) as HTMLElement | null;

      // console.info(`ScrollToHash: hash=${hash}, element=${element}`);

      if (element) {
        const initialScrollY = window.scrollY;

        // Wait for layout stabilization and potential browser-native scrolling
        setTimeout(() => {
          const currentScrollY = window.scrollY;
          const scrollDelta = Math.abs(currentScrollY - initialScrollY);

          const maxScrollY =
            document.documentElement.scrollHeight - window.innerHeight;
          const isAtOrPastBottom = window.scrollY >= maxScrollY - 1;
          const browserDidNotScroll = scrollDelta < 2;

          // console.log(`ScrollToHash:`, isAtOrPastBottom, browserDidNotScroll);

          if (isAtOrPastBottom || browserDidNotScroll) {
            // Fix Safari: jump to bottom, then scroll smoothly to target
            if (isAtOrPastBottom) {
              window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "auto",
              });
            }

            // If browser didn't scroll to the hash target, do it manually
            setTimeout(() => {
              element.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }

          // Schedule the hash cleanup (remove the hash to
          // allow repeated nav clicks, otherwise scrolling to an element
          // the second time won't work.)
          // Doesn't need to happen immediately, but give enough time
          // for all scrolling to complete.
          cleanupTimeoutRef.current = window.setTimeout(() => {
            navigate("", { replace: true });
            cleanupTimeoutRef.current = null;
          }, 1000);
        }, 100);
      }
    }

    // Cleanup when component unmounts or hash changes
    return () => {
      if (cleanupTimeoutRef.current !== null) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };
  }, [hash, navigate]);

  return null; // Is a component, but doesn't render anything to the screen.
};

export default ScrollToHash;
