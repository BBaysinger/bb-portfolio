import { useState, useEffect, useCallback } from "react";

const getHeight = () =>
  typeof document !== "undefined" ? document.documentElement.clientHeight : 0;

const getWidth = () =>
  typeof document !== "undefined" ? document.documentElement.clientWidth : 0;

/**
 *
 *
 */
const useClientDimensions = () => {
  // Start with 0 to avoid SSR crash and mismatch
  const [clientHeight, setClientHeight] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);

  const updateClientDimensions = useCallback(() => {
    const height = getHeight();
    const width = getWidth();

    setClientHeight(height);
    setClientWidth(width);

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        "--client-height",
        `${height}px`,
      );
      document.documentElement.style.setProperty(
        "--client-width",
        `${width}px`,
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    updateClientDimensions();

    const handleResize = () => requestAnimationFrame(updateClientDimensions);

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [updateClientDimensions]);

  return { clientHeight, clientWidth };
};

export default useClientDimensions;
