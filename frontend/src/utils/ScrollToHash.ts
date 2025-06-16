import { useEffect } from "react";
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

  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash);

      if (element) {
        // Wait for the next frame to ensure layout is stable. Becomes
        // a factor when the footer is positioned via translateY (the strategy
        // used for the carousel to prevent content height changes from causing jank.)
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });

          // Temporarily remove the hash to allow repeated clicks.
          setTimeout(() => {
            navigate("", { replace: true });
          }, 300);
        }, 200);
      }
    }
  }, [hash, navigate]);

  return null; // Is a component, but doesn't render anything to the screen.
};

export default ScrollToHash;
