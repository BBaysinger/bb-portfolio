import clsx from "clsx";
import React, { forwardRef, useImperativeHandle, useRef, useMemo } from "react";

import { resolveClass } from "@/utils/resolveClass";

import Carousel from "./Carousel";
import { CarouselRef, DirectionType, SourceType } from "./CarouselTypes";
import styles from "./LayeredCarouselManager.module.scss";

export interface CarouselLayerConfig {
  id: string;
  spacing: number;
  slides: React.ReactNode[];
  multiplier?: number;
  type: "Slave" | "Master";
}

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
 * - Slave layers mirror the master layer’s scroll position via dynamic multipliers.
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
 * @author Bradley Baysinger
 * @since 2025
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
    const masterCarouselRef = useRef<CarouselRef | null>(null);

    const layerRefs = useMemo(() => {
      const refs: Record<string, React.RefObject<CarouselRef | null>> = {};
      layers.forEach((layer) => {
        if (layer.type === "Slave") {
          refs[layer.id] = React.createRef<CarouselRef>();
        }
      });
      return refs;
    }, [layers]);

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

    const handleScrollUpdate = (scrollLeft: number) => {
      Object.entries(multipliers).forEach(([id, factor]) => {
        layerRefs[id]?.current?.setExternalScrollPosition?.(
          scrollLeft * factor,
        );
      });
      onScrollUpdate?.(scrollLeft);
    };

    const handleStabilizationUpdate = (
      index: number,
      source: SourceType,
      direction: DirectionType,
    ) => {
      stabilizedIndexRef.current = index;
      onStabilizationUpdate?.(index, source, direction);
    };

    useImperativeHandle(ref, () => ({
      scrollToSlide: (targetIndex: number) => {
        masterCarouselRef.current?.scrollToSlide(targetIndex);
      },
    }));

    return (
      <div
        className={clsx(
          resolveClass("layeredCarouselManager", prefix, styles, styleMap),
          className,
        )}
      >
        {layers.map((layer) => {
          const isMaster = layer.type === "Master";
          const layerRef = isMaster ? masterCarouselRef : layerRefs[layer.id];

          return (
            <Carousel
              key={layer.id}
              ref={layerRef as React.Ref<CarouselRef>}
              slides={layer.slides.map((slide, index) => {
                const isStabilized = index === stabilizedIndexRef.current;
                return (
                  <div
                    key={index}
                    className={clsx(
                      isStabilized &&
                        resolveClass(
                          `${layer.id}Stabilized`,
                          prefix,
                          styles,
                          styleMap,
                        ),
                    )}
                  >
                    {slide}
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
