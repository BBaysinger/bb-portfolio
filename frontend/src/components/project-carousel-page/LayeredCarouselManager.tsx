import clsx from "clsx";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useMemo,
  useState,
} from "react";

import { resolveClass } from "@/utils/resolveClass";

import Carousel from "./Carousel";
import {
  CarouselRef,
  DirectionType,
  SourceType,
  SlideDirection,
} from "./CarouselTypes";
import styles from "./LayeredCarouselManager.module.scss";

type LoadableSlideProps = {
  loading?: "eager" | "lazy";
  shouldLoad?: boolean;
  onScreenshotLoad?: () => void;
};

const makeKey = (layerId: string, index: number) => `${layerId}:${index}`;

export interface CarouselLayerConfig {
  id: string;
  spacing: number;
  slides: React.ReactNode[];
  multiplier?: number;
  type: "Slave" | "Master";
}

/**
 * Layered carousel management system for synchronized parallax effects.
 *
 * Manages multiple carousel layers with master/slave architecture for creating
 * complex parallax animations. The master carousel handles user interactions
 * while slave carousels follow with configurable multipliers and spacing.
 *
 * Features:
 * - Master/slave carousel synchronization
 * - Configurable parallax multipliers per layer
 * - Custom spacing and slide content per layer
 * - Unified control interface for external components
 * - Smooth scrolling and position tracking
 *
 * @component
 * @param {Object} props - Component props
 * @param {CarouselLayerConfig[]} [props.layers] - Configuration for each carousel layer
 * @param {string} [props.prefix] - CSS class prefix for styling
 * @param {React.Ref} ref - Forwarded ref for external control
 */
export interface LayeredCarouselManagerProps {
  layers?: CarouselLayerConfig[];
  prefix?: string;
  styleMap?: { [key: string]: string };
  initialIndex?: number;
  onScrollUpdate?: (scrollLeft: number) => void;
  onStabilizationUpdate?: (
    index: number,
    source: SourceType,
    direction: DirectionType,
  ) => void;
  className?: string;
}

export interface LayeredCarouselManagerRef {
  scrollToSlide: (targetIndex: number) => void;
}

/**
 * LayeredCarouselManager Component
 *
 * - Low-level core of the synchronized scroll system.
 * - Accepts a configurable set of "layers" consisting of master and slave carousels.
 * - The master layer drives scroll position and stabilization events.
 * - Slave layers mirror the master layer's scroll position via dynamic multipliers.
 * - Enables parallax, synchronized device displays, and complex carousel-based UIs.
 *
 * Behavior:
 * - Each layer is a Carousel instance, assigned either "Master" or "Slave" type.
 * - Slaves listen to the master's scroll position (adjusted by spacing multipliers).
 * - Master emits `onScrollUpdate` and `onStabilizationUpdate` when interaction occurs.
 * - The component uses `useImperativeHandle` to expose `scrollToSlide` on the master.
 * - Optionally stabilizes slide elements with a CSS class when their index matches.
 *
 * Props:
 * - `layers`: Array of layer configs, each with ID, spacing, slides, and type.
 * - `prefix`: Optional class name prefix for consistency and modularity.
 * - `styleMap`: CSS module mapping used with `resolveClass`.
 * - `initialIndex`: Starting slide index for all carousels.
 * - `onScrollUpdate`: Callback fired on every master scroll position update.
 * - `onStabilizationUpdate`: Callback when a scroll completes and locks onto a slide.
 * - `className`: Optional external class for layout styling.
 *
 * Layer Design:
 * - Slave layers display the visuals (e.g., phones, laptops).
 * - Master layer may be invisible, acting purely as a control layer (e.g., scrollbar logic).
 *
 * Example Usage:
 * Used by `ProjectCarouselView` to render a custom synchronized carousel with
 * interactive parallax layers and route-driven slide control.
 *
 * This is the key abstraction for custom scrollbar behavior and layered scroll syncing.
 *
 */
const LayeredCarouselManager = forwardRef<
  LayeredCarouselManagerRef,
  LayeredCarouselManagerProps
>(
  (
    {
      layers = [],
      prefix = "",
      styleMap,
      initialIndex = 0,
      onScrollUpdate,
      onStabilizationUpdate,
      className = "",
    },
    ref,
  ) => {
    const stabilizedIndexRef = useRef<number | null>(initialIndex);
    const [stabilizedIndex, setStabilizedIndex] = useState(initialIndex);
    // IMPORTANT: Do NOT store CarouselRef handles in React state.
    // Carousel's imperative handle object can change identity on re-renders,
    // which would cause ref callbacks to fire repeatedly and setState loops.
    const masterCarouselRef = useRef<CarouselRef | null>(null);
    const slaveCarouselsRef = useRef<Record<string, CarouselRef | null>>({});
    const [currentDirection, setCurrentDirection] =
      useState<DirectionType | null>(null);
    const lastScrollLeftRef = useRef<number>(0);

    // Tracks the "live" index while scrolling (not just the stabilized index)
    // so we can prime the left/right neighbors ahead of time.
    const [activeIndex, setActiveIndex] = useState<number>(initialIndex);

    // Load the active slide first, then (after first paint) prime neighbors.
    const [shouldPrimeNeighbors, setShouldPrimeNeighbors] = useState(false);

    // Deterministic loading latch:
    // - `eligibleKeys` only grows (never shrinks)
    // - `loadAllSlides` flips once initial trio has loaded
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

    // Prime neighbors right after first paint, using the latest activeIndex.
    useEffect(() => {
      if (shouldPrimeNeighbors) return;
      const rafId = requestAnimationFrame(() => {
        setShouldPrimeNeighbors(true);
        setEligibleKeys((prev) => {
          const next = new Set(prev);
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
    }, [shouldPrimeNeighbors, activeIndex, layers]);

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

    const masterLayer = useMemo(
      () => layers.find((l) => l.type === "Master"),
      [layers],
    );

    const multipliers = useMemo(() => {
      if (!masterLayer) return {};
      const map: Record<string, number> = {};
      layers.forEach((layer) => {
        if (layer.type === "Slave") {
          map[layer.id] =
            layer.multiplier ?? layer.spacing / masterLayer.spacing;
        }
      });
      return map;
    }, [layers, masterLayer]);

    const handleScrollUpdate = useCallback(
      (scrollLeft: number) => {
        // Determine direction based on scroll movement
        if (scrollLeft > lastScrollLeftRef.current) {
          setCurrentDirection(SlideDirection.LEFT);
        } else if (scrollLeft < lastScrollLeftRef.current) {
          setCurrentDirection(SlideDirection.RIGHT);
        }
        lastScrollLeftRef.current = scrollLeft;

        Object.entries(multipliers).forEach(([id, factor]) => {
          slaveCarouselsRef.current[id]?.setExternalScrollPosition?.(
            scrollLeft * factor,
          );
        });
        onScrollUpdate?.(scrollLeft);
      },
      [multipliers, onScrollUpdate],
    );

    const handleStabilizationUpdate = (
      index: number,
      source: SourceType,
      direction: DirectionType,
    ) => {
      stabilizedIndexRef.current = index;
      setStabilizedIndex(index);
      // Clear direction when stabilized so phones return to neutral position
      setCurrentDirection(null);
      onStabilizationUpdate?.(index, source, direction);
    };

    const handleIndexUpdate = useCallback(
      (index: number) => {
        setActiveIndex(index);

        // Latch eligibility so we never unload already-started images.
        setEligibleKeys((prev) => {
          const next = new Set(prev);
          layers.forEach((layer) => {
            if (layer.type !== "Slave") return;
            const len = layer.slides.length;
            if (len <= 0) return;
            const center = ((index % len) + len) % len;
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

    useImperativeHandle(ref, () => ({
      scrollToSlide: (targetIndex: number) => {
        console.info("LayeredCarouselManager: scrolling to", targetIndex);
        masterCarouselRef.current?.scrollToSlide(targetIndex);
      },
    }));

    const attachCarouselRef = useCallback(
      (layerId: string, isMaster: boolean) =>
        (instance: CarouselRef | null) => {
          if (isMaster) {
            masterCarouselRef.current = instance;
            return;
          }

          slaveCarouselsRef.current[layerId] = instance;
        },
      [],
    );

    // IMPORTANT: refs must be stable across renders.
    // Calling attachCarouselRef(...) inline creates a new function each render,
    // which makes React detach/attach refs repeatedly (can cause an update loop).
    const layerRefCallbacks = useMemo(() => {
      const callbacks: Record<string, React.RefCallback<CarouselRef>> = {};
      layers.forEach((layer) => {
        const isMaster = layer.type === "Master";
        callbacks[layer.id] = attachCarouselRef(layer.id, isMaster);
      });
      return callbacks;
    }, [layers, attachCarouselRef]);

    return (
      <div
        className={clsx(
          resolveClass("layeredCarouselManager", prefix, styles, styleMap),
          className,
        )}
      >
        {layers.map((layer) => {
          const isMaster = layer.type === "Master";

          const slidesLength = layer.slides.length;
          const prevIndex = (activeIndex - 1 + slidesLength) % slidesLength;
          const nextIndex = (activeIndex + 1) % slidesLength;

          return (
            <Carousel
              key={layer.id}
              ref={layerRefCallbacks[layer.id] as React.Ref<CarouselRef>}
              slides={layer.slides.map((slide, index) => {
                const isStabilized = index === stabilizedIndex;
                const shouldApplyTilt =
                  layer.id === "Phones" && !isStabilized && currentDirection;
                const appliedClasses = clsx(
                  isStabilized && "bbStabilizedSlide",
                  shouldApplyTilt &&
                    currentDirection === SlideDirection.LEFT &&
                    "bbTiltLeft",
                  shouldApplyTilt &&
                    currentDirection === SlideDirection.RIGHT &&
                    "bbTiltRight",
                );

                const isActive = index === activeIndex;
                const isNeighbor = index === prevIndex || index === nextIndex;

                // Deterministic load control:
                // - Active slide: load immediately
                // - Neighbors: load right after first paint
                // - Remaining slides: load after initial trio finishes
                const key = makeKey(layer.id, index);
                const shouldLoad =
                  loadAllSlides ||
                  eligibleKeys.has(key) ||
                  isActive ||
                  (shouldPrimeNeighbors && isNeighbor);

                // Hint only (the real gating is `shouldLoad` in DeviceDisplay)
                const loading: "eager" | "lazy" =
                  isActive || (shouldPrimeNeighbors && isNeighbor)
                    ? "eager"
                    : "lazy";

                const renderedSlide = React.isValidElement(slide)
                  ? React.cloneElement(
                      slide as React.ReactElement<LoadableSlideProps>,
                      {
                        loading,
                        shouldLoad,
                        onScreenshotLoad: () =>
                          markInitialSlideLoaded(layer.id, index),
                      },
                    )
                  : slide;

                return (
                  <div key={index} className={appliedClasses}>
                    {renderedSlide}
                  </div>
                );
              })}
              slideSpacing={layer.spacing}
              initialIndex={initialIndex}
              classNamePrefix={prefix}
              styleMap={styleMap}
              layerId={layer.id}
              isSlaveMode={!isMaster}
              onScrollUpdate={isMaster ? handleScrollUpdate : undefined}
              onIndexUpdate={isMaster ? handleIndexUpdate : undefined}
              onStabilizationUpdate={
                isMaster ? handleStabilizationUpdate : undefined
              }
              debug={0}
            />
          );
        })}
      </div>
    );
  },
);

LayeredCarouselManager.displayName = "LayeredCarouselManager";

export default LayeredCarouselManager;
