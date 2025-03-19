import { useState, useEffect, useCallback } from "react";

const getHeight = () => document.documentElement.clientHeight;
const getWidth = () => document.documentElement.clientWidth;

const useClientDimensions = () => {
  const [clientHeight, setClientHeight] = useState(getHeight());
  const [clientWidth, setClientWidth] = useState(getWidth());

  const updateClientDimensions = useCallback(() => {
    setClientHeight(getHeight());
    setClientWidth(getWidth());
  }, []);

  useEffect(() => {
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
