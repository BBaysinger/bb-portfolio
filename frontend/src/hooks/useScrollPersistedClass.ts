import { useState, useEffect, useRef } from "react";

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
  const hasScrolledOutRef = useRef(false);

  useEffect(() => {
    hasScrolledOutRef.current = hasScrolledOut;
  }, [hasScrolledOut]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(storageKey) === "true";
      const frame = requestAnimationFrame(() => {
        setHasScrolledOut(stored);
        hasScrolledOutRef.current = stored;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      const element = document.getElementById(id);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const scrolledPercentage = (rect.top + rect.height / 2) / windowHeight;

      if (scrolledPercentage < threshold) {
        if (!hasScrolledOutRef.current) {
          setHasScrolledOut(true);
          hasScrolledOutRef.current = true;
          sessionStorage.setItem(storageKey, "true"); // Persist in sessionStorage
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Ensure it runs on mount

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [id, threshold, storageKey]);

  return hasScrolledOut;
};

export default useScrollPersistedClass;
