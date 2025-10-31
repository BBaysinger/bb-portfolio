import clsx from "clsx";
import React, {
  forwardRef,
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
  Direction,
} from "./CarouselTypes";
import styles from "./LayeredCarouselManager.module.scss";

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
    const masterCarouselRef = useRef<CarouselRef | null>(null);
    const [currentDirection, setCurrentDirection] =
      useState<DirectionType | null>(null);
    const lastScrollLeftRef = useRef<number>(0);

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
      // Determine direction based on scroll movement
      if (scrollLeft > lastScrollLeftRef.current) {
        setCurrentDirection(Direction.LEFT);
      } else if (scrollLeft < lastScrollLeftRef.current) {
        setCurrentDirection(Direction.RIGHT);
      }
      lastScrollLeftRef.current = scrollLeft;

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
      // Clear direction when stabilized so phones return to neutral position
      setCurrentDirection(null);
      onStabilizationUpdate?.(index, source, direction);
    };

    useImperativeHandle(ref, () => ({
      scrollToSlide: (targetIndex: number) => {
        console.info("LayeredCarouselManager: scrolling to", targetIndex);
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
                const shouldApplyTilt =
                  layer.id === "Phones" && !isStabilized && currentDirection;
                const appliedClasses = clsx(
                  isStabilized && "bbStabilizedSlide",
                  shouldApplyTilt &&
                    currentDirection === Direction.LEFT &&
                    "bbTiltLeft",
                  shouldApplyTilt &&
                    currentDirection === Direction.RIGHT &&
                    "bbTiltRight",
                );

                return (
                  <div key={index} className={appliedClasses}>
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
