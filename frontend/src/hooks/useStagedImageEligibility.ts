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
 * - After the initial trio actually finishes loading, allow all remaining slides
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
    [layers, shouldPrimeNeighbors],
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
          setLoadAllSlides(true);
        }
        return next;
      });
    },
    [initialTargets, loadAllSlides],
  );

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
