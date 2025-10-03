import { useEffect, useState } from "react";

/**
 * Hook to get the appropriate thumbnail URL based on viewport size
 * @param thumbUrl - Full resolution thumbnail URL
 * @param thumbUrlMobile - Mobile-optimized thumbnail URL (400x300)
 * @param breakpoint - Viewport width threshold (default: 768px)
 * @returns The appropriate image URL for current viewport
 */
export function useResponsiveThumbnail(
  thumbUrl?: string,
  thumbUrlMobile?: string,
  breakpoint = 768
): string | undefined {
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(thumbUrl);

  useEffect(() => {
    const updateUrl = () => {
      const isSmallViewport = window.innerWidth < breakpoint;
      const selectedUrl = isSmallViewport 
        ? (thumbUrlMobile || thumbUrl) 
        : (thumbUrl || thumbUrlMobile);
      setCurrentUrl(selectedUrl);
    };

    // Set initial URL
    updateUrl();

    // Listen for viewport changes
    window.addEventListener("resize", updateUrl);
    return () => window.removeEventListener("resize", updateUrl);
  }, [thumbUrl, thumbUrlMobile, breakpoint]);

  return currentUrl;
}