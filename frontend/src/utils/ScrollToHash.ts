import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Component: ScrollToHash
 *
 * Automatically scrolls to an element with the ID specified in the URL hash
 * whenever the hash changes. Handles repeated clicks on the same hash by
 * programmatically resetting the hash.
 *
 * @returns {null} This component does not render anything visible on the screen.
 *
 * @remarks
 * This component uses the `useLocation` hook to extract the hash from the current URL
 * and the `useNavigate` hook to enable programmatic navigation. When the hash changes,
 * it attempts to find a DOM element with the matching ID and scrolls to it smoothly.
 * After scrolling, it temporarily removes the hash to allow repeated clicks on the same hash.
 *
 * @example
 * // Example usage in a React component
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
    // Clear any pending timeout from previous hash change
    if (cleanupTimeoutRef.current !== null) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (hash) {
      const element = document.querySelector(hash);

      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });

          // Schedule the hash cleanup (remove the hash to
          // allow repeated nav clicks, otherwise scrolling to an element
          // the second time won't work.)
          // Doesn't need to happen immediately, so give enough time
          // for the scroll to complete, in order to avoid interrupting
          // the smooth scroll.
          // cleanupTimeoutRef.current = window.setTimeout(() => {
          //   navigate("", { replace: true });
          //   cleanupTimeoutRef.current = null;
          // }, 2000);
        }, 200);
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
