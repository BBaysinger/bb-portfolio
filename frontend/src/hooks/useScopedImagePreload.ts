import { useEffect } from "react";

/**
 * useScopedImagePreload
 *
 * Preloads a single image and keeps it in memory while the component is mounted.
 * This includes adding a <link rel="preload"> to the document head,
 * decoding the image using JavaScript, and inserting a hidden <img> in the DOM
 * to retain memory caching (helpful for performance-critical assets like sprite sheets).
 *
 * Intended for use in cases where only one sprite sheet or visual asset needs to remain warm.
 * Automatically cleans up resources when the component unmounts.
 *
 * There's a list of todos at the end of the file for future enhancements.
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

export default useScopedImagePreload;

/**
 * TODO: Extend this hook with additional functionality if needed:
 *
 * @feature Loading State
 * Track when the image finishes loading and decoding.
 * Useful for conditional rendering or triggering dependent effects.
 *
 * @feature Error Handling
 * Catch decode/load failures and expose an error state.
 * Optionally retry or fall back to a placeholder image.
 *
 * @feature Multiple Image Support
 * Accept an array of `src` values and preload them concurrently.
 * Handle cleanup and load tracking for each.
 *
 * @feature Memory Management
 * Implement optional max retention or LRU-style logic.
 * Consider skipping DOM retention for desktop, or delaying it until user interaction.
 *
 * @feature Config Options
 * Add flags like `retainInDOM`, `decodeOnly`, or `preloadOnly` to allow granular control.
 */
