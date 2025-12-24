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
 */
import { createDebugLogger } from "@/utils/Logging";

interface PreloadOptions {
  decode?: boolean;
  decodeOnIdle?: boolean;
  retainInDOM?: boolean;
  preloadOnly?: boolean;
  loadPriority?: "high" | "auto" | "low";
  type?: string;
  debug?: boolean;
}

/**
 * useScopedImagePreload
 *
 * Preloads a single image and keeps it in memory while the component is mounted.
 * Adds a <link rel="preload">, decodes the image, and inserts a hidden <img> to preserve memory cache.
 *
 */
export function useScopedImagePreload(
  src: string,
  options: PreloadOptions = {},
) {
  const {
    decode = true,
    decodeOnIdle = false,
    retainInDOM = true,
    preloadOnly = false,
    loadPriority = "auto",
    type = "image/webp",
    debug = false,
  } = options;

  const log = createDebugLogger(debug);

  useEffect(() => {
    if (!src) {
      if (debug) console.warn("🟡 useScopedImagePreload: No `src` provided.");
      return;
    }

    log(`🔵 Preloading: ${src}`);
    log(
      `⚙️ Options -> decode: ${decode}, decodeOnIdle: ${decodeOnIdle}, retainInDOM: ${retainInDOM}, preloadOnly: ${preloadOnly}, priority: ${loadPriority}`,
    );

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;
    link.type = type;

    if ("fetchPriority" in link) {
      (
        link as HTMLLinkElement & {
          fetchPriority: "high" | "auto" | "low";
        }
      ).fetchPriority = loadPriority;
    }

    document.head.appendChild(link);
    log("🟢 Preload link inserted");

    if (preloadOnly) {
      return () => {
        // Cleanup must be resilient to StrictMode double-invocation and
        // to environments where head/body may temporarily be unavailable.
        link.parentNode?.removeChild(link);
        log("🔴 Preload-only cleanup for", src);
      };
    }

    const img = new Image();
    img.src = src;

    if (decode && img.decode) {
      const doDecode = () =>
        img
          .decode?.()
          .then(() => log("✅ Image decoded:", src))
          .catch((err) => debug && console.warn("❌ Decode failed:", err));

      if (decodeOnIdle && "requestIdleCallback" in window) {
        requestIdleCallback(doDecode);
      } else {
        doDecode();
      }
    }

    let ghost: HTMLImageElement | null = null;

    if (retainInDOM) {
      ghost = document.createElement("img");
      ghost.src = src;
      ghost.style.position = "absolute";
      ghost.style.width = "1px";
      ghost.style.height = "1px";
      ghost.style.opacity = "0";
      ghost.style.pointerEvents = "none";
      document.body.appendChild(ghost);
      log("🟢 Ghost image inserted");
    }

    return () => {
      link.parentNode?.removeChild(link);
      ghost?.parentNode?.removeChild(ghost);
      log("🔴 Preload cleanup for", src);
    };
  }, [
    src,
    decode,
    decodeOnIdle,
    retainInDOM,
    preloadOnly,
    loadPriority,
    type,
    debug,
    log,
  ]);
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
