import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Component: ScrollToHash
 *
 * Automatically scrolls to an element with the ID specified in the URL hash
 * whenever the hash changes. Handles repeated clicks on the same hash by
 * programmatically resetting the hash.
 *
 * @author Bradley Baysinger
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
 */
const ScrollToHash = () => {
  const { hash } = useLocation(); // Extracts the hash from the current URL.
  const navigate = useNavigate(); // Allows programmatic navigation.

  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash); // Selects the DOM element with the matching ID.

      if (element) {
        // Scroll to the element with smooth scrolling.
        element.scrollIntoView({ behavior: "smooth" });

        // Temporarily remove the hash to enable repeated clicks.
        const clearHash = () => navigate("", { replace: true });
        setTimeout(clearHash, 300); // Delay to clear hash after scrolling.
      }
    }
  }, [hash, navigate]); // Runs when `hash` changes.

  return null; // Doesn't render anything visible on the screen.
};

export default ScrollToHash;
