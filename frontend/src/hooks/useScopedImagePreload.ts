import { useEffect, useMemo } from "react";

/**
 * useScopedImagePreload
 *
 * Preloads a single image and keeps it in memory while the component is mounted.
 * This includes adding a <link rel="preload"> to the document head,
 * decoding the image using JavaScript, and inserting a hidden <img> in the DOM
 * to retain memory caching (helpful for performance-critical assets like sprite sheets).
 *
 * IMPORTANT LIMITATION:
 * This hook runs in a `useEffect`, so it is client-only and executes after hydration.
 * That means it is NOT a guaranteed "early preload" and may not show up as an initial
 * navigation preload in DevTools (the browser may have already moved on, or the resource
 * may be discovered too late to matter).
 *
 * If you need true early preloading, prefer a server-rendered `<link rel="preload" as="image">`
 * in the App Router `layout.tsx`/`head.tsx`.
 *
 * DEPRECATED: TODO: Evaluate if this has any merit, since I never saw it actually work. IDK if that
 * had anything to do with how I was using it; in for sprite sheet animations.
 *
 * Intended for use in cases where only one sprite sheet or visual asset needs to remain warm.
 * Automatically cleans up resources when the component unmounts.
 *
 * There's a list of todos at the end of the file for future enhancements.
 *
 */
import { createDebugLogger } from "@/utils/Logging";

type PreloadEntry = {
  refCount: number;
  link: HTMLLinkElement;
  ghost: HTMLImageElement | null;
};

const preloadRegistry = new Map<string, PreloadEntry>();

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

  const log = useMemo(() => createDebugLogger(debug), [debug]);

  useEffect(() => {
    if (!src) {
      if (debug) console.warn("🟡 useScopedImagePreload: No `src` provided.");
      return;
    }

    // Ensure we only insert one <link rel="preload"> + ghost <img> per src, even if
    // multiple components mount (or StrictMode re-renders) call this hook.
    const existing = preloadRegistry.get(src);
    if (existing) {
      existing.refCount++;
      log(`🟣 Preload already registered (${existing.refCount}): ${src}`);
      return () => {
        const current = preloadRegistry.get(src);
        if (!current) return;
        current.refCount = Math.max(0, current.refCount - 1);
        log(`🟤 Preload refCount-- (${current.refCount}): ${src}`);
        if (current.refCount === 0) {
          current.link.parentNode?.removeChild(current.link);
          current.ghost?.parentNode?.removeChild(current.ghost);
          preloadRegistry.delete(src);
          log("🔴 Preload cleanup for", src);
        }
      };
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
      preloadRegistry.set(src, {
        refCount: 1,
        link,
        ghost: null,
      });

      return () => {
        const current = preloadRegistry.get(src);
        if (!current) return;
        current.refCount = Math.max(0, current.refCount - 1);
        if (current.refCount === 0) {
          link.parentNode?.removeChild(link);
          preloadRegistry.delete(src);
          log("🔴 Preload-only cleanup for", src);
        }
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

    preloadRegistry.set(src, {
      refCount: 1,
      link,
      ghost,
    });

    return () => {
      const current = preloadRegistry.get(src);
      if (!current) return;
      current.refCount = Math.max(0, current.refCount - 1);
      log(`🟤 Preload refCount-- (${current.refCount}): ${src}`);
      if (current.refCount === 0) {
        current.link.parentNode?.removeChild(current.link);
        current.ghost?.parentNode?.removeChild(current.ghost);
        preloadRegistry.delete(src);
        log("🔴 Preload cleanup for", src);
      }
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
