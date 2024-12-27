import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Component: ScrollToHash
 *
 * Automatically scrolls to an element with the ID specified in the URL hash
 * whenever the hash changes. The scrolling is smooth for better user experience.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const ScrollToHash = () => {
  const { hash } = useLocation(); // Extracts the hash (e.g., #section1) from the current URL.

  useEffect(() => {
    // Effect triggered whenever the hash changes.
    if (hash) {
      // Checks if a hash exists in the URL.
      const element = document.querySelector(hash); // Selects the DOM element with the matching ID.
      if (element) {
        // Scrolls to the element if it exists in the document.
        element.scrollIntoView({ behavior: "smooth" }); // Smooth scrolling for better UX.
      }
    }
  }, [hash]); // Dependency array ensures this effect runs only when `hash` changes.

  return null; // Doesn't render anything visible on the screen.
};

export default ScrollToHash;
