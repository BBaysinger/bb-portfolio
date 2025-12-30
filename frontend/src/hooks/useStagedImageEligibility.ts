import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type StagedEligibilityLayer = {
  id: string;
  type: "Slave" | "Master";
  slides: unknown[];
};

type Options = {
  /** Starting slide index for staged loading. */
  initialIndex: number;
};

const makeKey = (layerId: string, index: number) => `${layerId}:${index}`;

/**
 * Staged image eligibility for carousels:
 * - Eagerly load the active slide
 * - After first paint, also load left/right neighbors
 * - After the initial trio finishes loading, allow all remaining slides
 * - Eligibility is monotonic: once eligible, stays eligible
 */
export const useStagedImageEligibility = (
  layers: StagedEligibilityLayer[],
  { initialIndex }: Options,
) => {
  const lastActiveIndexRef = useRef<number>(initialIndex);

  const [shouldPrimeNeighbors, setShouldPrimeNeighbors] = useState(false);

  const initialTargets = useMemo(() => {
    const targets = new Set<string>();
    layers.forEach((layer) => {
      if (layer.type !== "Slave") return;
      const len = layer.slides.length;
      if (len <= 0) return;
      const center = ((initialIndex % len) + len) % len;
      const prev = (center - 1 + len) % len;
      const next = (center + 1) % len;
      targets.add(makeKey(layer.id, center));
      targets.add(makeKey(layer.id, prev));
      targets.add(makeKey(layer.id, next));
    });
    return targets;
  }, [layers, initialIndex]);

  const [eligibleKeys, setEligibleKeys] = useState<Set<string>>(() => {
    const next = new Set<string>();
    layers.forEach((layer) => {
      if (layer.type !== "Slave") return;
      const len = layer.slides.length;
      if (len <= 0) return;
      const center = ((initialIndex % len) + len) % len;
      next.add(makeKey(layer.id, center));
    });
    return next;
  });

  const [loadAllSlides, setLoadAllSlides] = useState(false);
  const [_initialLoadedKeys, setInitialLoadedKeys] = useState<Set<string>>(
    () => new Set(),
  );

  // Requirement:
  // - The initial visible + adjacent trio should load first.
  // - The remaining slides should begin loading after the initial trio, once the browser is idle.
  // - If the user starts scrolling, begin loading all slides immediately.
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [initialTrioLoaded, setInitialTrioLoaded] = useState(false);

  // Treat any explicit scroll/touch as "user started scrolling".
  // (Relying on index changes alone is insufficient if the user nudges the page
  // but the carousel doesn't stabilize to a new index.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userHasInteracted) return;

    const onFirstInteraction = () => setUserHasInteracted(true);
    window.addEventListener("wheel", onFirstInteraction, { passive: true });
    window.addEventListener("touchmove", onFirstInteraction, { passive: true });
    return () => {
      window.removeEventListener("wheel", onFirstInteraction);
      window.removeEventListener("touchmove", onFirstInteraction);
    };
  }, [userHasInteracted]);

  // Prime neighbors right after first paint, using the last active index we saw.
  // Avoid setState synchronously in effect body (lint rule).
  useEffect(() => {
    if (shouldPrimeNeighbors) return;
    const rafId = requestAnimationFrame(() => {
      setShouldPrimeNeighbors(true);
      setEligibleKeys((prev) => {
        const next = new Set(prev);
        const activeIndex = lastActiveIndexRef.current;
        layers.forEach((layer) => {
          if (layer.type !== "Slave") return;
          const len = layer.slides.length;
          if (len <= 0) return;
          const center = ((activeIndex % len) + len) % len;
          const prevIdx = (center - 1 + len) % len;
          const nextIdx = (center + 1) % len;
          next.add(makeKey(layer.id, center));
          next.add(makeKey(layer.id, prevIdx));
          next.add(makeKey(layer.id, nextIdx));
        });
        return next;
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [shouldPrimeNeighbors, layers]);

  const noteActiveIndex = useCallback(
    (activeIndex: number) => {
      lastActiveIndexRef.current = activeIndex;

      // If the user advances the active index away from the entry position,
      // treat it as an interaction and start loading remaining slides.
      if (!userHasInteracted && activeIndex !== initialIndex) {
        setUserHasInteracted(true);
      }

      // Latch eligibility so we never unload already-started images.
      setEligibleKeys((prev) => {
        const next = new Set(prev);
        layers.forEach((layer) => {
          if (layer.type !== "Slave") return;
          const len = layer.slides.length;
          if (len <= 0) return;
          const center = ((activeIndex % len) + len) % len;
          next.add(makeKey(layer.id, center));
          if (shouldPrimeNeighbors) {
            const prevIdx = (center - 1 + len) % len;
            const nextIdx = (center + 1) % len;
            next.add(makeKey(layer.id, prevIdx));
            next.add(makeKey(layer.id, nextIdx));
          }
        });
        return next;
      });
    },
    [layers, shouldPrimeNeighbors, userHasInteracted, initialIndex],
  );

  const markInitialSlideLoaded = useCallback(
    (layerId: string, index: number) => {
      if (loadAllSlides) return;

      const key = makeKey(layerId, index);
      if (!initialTargets.has(key)) return;

      setInitialLoadedKeys((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        if (initialTargets.size > 0 && next.size >= initialTargets.size) {
          setInitialTrioLoaded(true);
        }
        return next;
      });
    },
    [initialTargets, loadAllSlides],
  );

  // Unlock background loading once:
  // - user starts scrolling, OR
  // - initial trio is loaded and the browser is idle (avoid competing with initial render)
  useEffect(() => {
    if (loadAllSlides) return;

    if (userHasInteracted) {
      const rafId = requestAnimationFrame(() => setLoadAllSlides(true));
      return () => cancelAnimationFrame(rafId);
    }

    if (!initialTrioLoaded) return;

    const unlock = () => setLoadAllSlides(true);

    // Prefer idle time; fall back to a short timeout.
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(unlock, { timeout: 2000 });
      return () => window.cancelIdleCallback?.(id);
    }

    const t = setTimeout(unlock, 300);
    return () => clearTimeout(t);
  }, [loadAllSlides, initialTrioLoaded, userHasInteracted]);

  const getShouldLoad = useCallback(
    (params: {
      layerId: string;
      index: number;
      isActive: boolean;
      isNeighbor: boolean;
    }) => {
      const key = makeKey(params.layerId, params.index);
      return (
        loadAllSlides ||
        eligibleKeys.has(key) ||
        params.isActive ||
        (shouldPrimeNeighbors && params.isNeighbor)
      );
    },
    [eligibleKeys, loadAllSlides, shouldPrimeNeighbors],
  );

  const getLoadingHint = useCallback(
    (params: { isActive: boolean; isNeighbor: boolean }): "eager" | "lazy" =>
      params.isActive || (shouldPrimeNeighbors && params.isNeighbor)
        ? "eager"
        : "lazy",
    [shouldPrimeNeighbors],
  );

  return {
    loadAllSlides,
    shouldPrimeNeighbors,
    noteActiveIndex,
    markInitialSlideLoaded,
    getShouldLoad,
    getLoadingHint,
  };
};
