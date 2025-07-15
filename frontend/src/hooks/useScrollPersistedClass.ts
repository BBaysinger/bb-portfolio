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
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("hasScrolledOut") === "true";
      setHasScrolledOut(stored);
    }
    const handleScroll = () => {
      const element = document.getElementById(id);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const scrolledPercentage = (rect.top + rect.height / 2) / windowHeight;

      if (scrolledPercentage < threshold) {
        if (!hasScrolledOut) {
          setHasScrolledOut(true);
          sessionStorage.setItem(storageKey, "true"); // Persist in sessionStorage
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Ensure it runs on mount

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [id, threshold, storageKey, hasScrolledOut]);

  return hasScrolledOut;
};

export default useScrollPersistedClass;
