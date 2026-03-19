import clsx from "clsx";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useMemo,
  useState,
} from "react";

import {
  useStagedImageEligibility,
  type StagedEligibilityLayer,
} from "@/hooks/useStagedImageEligibility";
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

export interface CarouselLayerConfig {
  id: string;
  spacing: number;
  slides: React.ReactNode[];
  multiplier?: number;
  type: "Slave" | "Master";
}

/**
 * Coordinates a master carousel with one or more synchronized slave layers.
 *
 * This component owns the layered composition model used by the project
 * carousel view. Each layer is configured independently, but only the master
 * is interactive. Slave layers mirror the master's movement using per-layer
 * multipliers so different device mockups can stay visually aligned while
 * moving at different rates.
 *
 * Synchronization model:
 * - The master emits an immediate visual-scroll callback so slaves can stay
 *   visually locked in the current frame.
 * - Semantic state such as active index, stabilization, and preload eligibility
 *   remains on the normal React update path.
 * - The manager is also responsible for applying cross-layer presentation
 *   state, such as tilt classes and staged image loading.
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

    const eligibilityLayers = useMemo(
      () =>
        layers.map(
          (layer): StagedEligibilityLayer => ({
            id: layer.id,
            type: layer.type,
            slides: layer.slides,
          }),
        ),
      [layers],
    );

    const stagedEligibility = useStagedImageEligibility(eligibilityLayers, {
      initialIndex,
    });

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

    // Fan out the master's current scroll position immediately so slave layers
    // update their projected positions in the same frame as the master.
    const syncSlaveVisuals = useCallback(
      (scrollLeft: number) => {
        Object.entries(multipliers).forEach(([id, factor]) => {
          slaveCarouselsRef.current[id]?.setExternalScrollPosition?.(
            scrollLeft * factor,
          );
        });
      },
      [multipliers],
    );

    const handleScrollUpdate = useCallback(
      (scrollLeft: number) => {
        // Determine direction based on scroll movement
        if (scrollLeft > lastScrollLeftRef.current) {
          setCurrentDirection(SlideDirection.LEFT);
        } else if (scrollLeft < lastScrollLeftRef.current) {
          setCurrentDirection(SlideDirection.RIGHT);
        }
        lastScrollLeftRef.current = scrollLeft;
        onScrollUpdate?.(scrollLeft);
      },
      [onScrollUpdate],
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

        stagedEligibility.noteActiveIndex(index);
      },
      [stagedEligibility],
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
              onImmediateScrollUpdate={isMaster ? syncSlaveVisuals : undefined}
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

                const shouldLoad = stagedEligibility.getShouldLoad({
                  layerId: layer.id,
                  index,
                  isActive,
                  isNeighbor,
                });

                const loading: "eager" | "lazy" =
                  stagedEligibility.getLoadingHint({
                    isActive,
                    isNeighbor,
                  });

                const renderedSlide = React.isValidElement(slide)
                  ? React.cloneElement(
                      slide as React.ReactElement<LoadableSlideProps>,
                      {
                        loading,
                        shouldLoad,
                        onScreenshotLoad: () =>
                          stagedEligibility.markInitialSlideLoaded(
                            layer.id,
                            index,
                          ),
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
