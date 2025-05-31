import { useEffect } from "react";

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export function useScopedImagePreload(src: string, type = "image/webp") {
  useEffect(() => {
    if (!src) return;

    // 1. Preload link in head
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    link.type = type;
    document.head.appendChild(link);

    // 2. Image decode
    const img = new Image();
    img.src = src;
    img.decode?.();

    // 3. Offscreen <img> to keep in memory
    const ghost = document.createElement("img");
    ghost.src = src;
    ghost.style.position = "absolute";
    ghost.style.width = "1px";
    ghost.style.height = "1px";
    ghost.style.opacity = "0";
    ghost.style.pointerEvents = "none";
    document.body.appendChild(ghost);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(ghost);
    };
  }, [src, type]);
}
