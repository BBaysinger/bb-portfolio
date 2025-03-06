import { useState, useEffect } from "react";

/**
 * Sets a persistent variable after scrolled (by a threshold) out of view.
 *
 * @param id
 * @param threshold
 * @param storageKey
 * @returns
 */

const useScrollPersistedClass = (
  id: string,
  threshold = 0.5,
  storageKey = "hasScrolledOut",
) => {
  const [hasScrolledOut, setHasScrolledOut] = useState(false);

  useEffect(() => {
    // On mount, check the sessionStorage for the persisted state
    const savedState = sessionStorage.getItem(storageKey);

    if (savedState === "true") {
      setHasScrolledOut(true); // If sessionStorage is 'true', keep the class added
    }

    const handleScroll = () => {
      const element = document.getElementById(id);
      if (!element) return;

      // Get the position of the element and check if it's scrolled more than `threshold` percentage out of view
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate percentage of element scrolled out of view
      const scrolledPercentage = (rect.top + rect.height / 2) / windowHeight;

      // If the element is scrolled past the threshold (out of view)
      if (scrolledPercentage < threshold) {
        // Set state and sessionStorage if it's not already marked
        if (!hasScrolledOut) {
          setHasScrolledOut(true);
          // sessionStorage.setItem(storageKey, 'true');
        }
      }
    };

    // Attach scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [id, threshold, storageKey, hasScrolledOut]);

  return hasScrolledOut;
};

export default useScrollPersistedClass;
