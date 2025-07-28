import React, { forwardRef, useImperativeHandle, useRef, useMemo } from "react";

import Carousel from "./Carousel";
import { CarouselRef, DirectionType, SourceType } from "./CarouselTypes";

export interface CarouselLayerConfig {
  id: string; // e.g. 'phones', 'laptops', 'depth1'
  spacing: number;
  slides: React.ReactNode[];
  multiplier?: number; // Optional; derived if not provided
  type: "slave" | "master";
}

export interface LayeredCarouselManagerProps {
  layers: CarouselLayerConfig[];
  prefix?: string; // e.g. 'bb-'
  styles?: { [key: string]: string }; // optional SCSS module
  initialIndex?: number;
  onScrollUpdate?: (scrollLeft: number) => void;
  onStabilizationUpdate?: (
    index: number,
    source: SourceType,
    direction: DirectionType,
  ) => void;
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
      layers,
      prefix = "",
      styles,
      initialIndex = 0,
      onScrollUpdate,
      onStabilizationUpdate,
    },
    ref,
  ) => {
    const stabilizedIndexRef = useRef<number | null>(initialIndex);
    const masterCarouselRef = useRef<CarouselRef | null>(null);

    const layerRefs = useMemo(() => {
      const refs: Record<string, React.RefObject<CarouselRef | null>> = {};
      layers.forEach((layer) => {
        if (layer.type === "slave") {
          refs[layer.id] = React.createRef<CarouselRef>();
        }
      });
      return refs;
    }, [layers]);

    const masterLayer = useMemo(
      () => layers.find((l) => l.type === "master"),
      [layers],
    );

    const multipliers = useMemo(() => {
      if (!masterLayer) return {};
      const map: Record<string, number> = {};
      layers.forEach((layer) => {
        if (layer.type === "slave") {
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

    const getWrapperClass = (layerId: string) => {
      const base = `${prefix}${layerId}Carousel`;
      return styles?.[`${layerId}Wrapper`] ?? base;
    };

    const getSlideClass = (layerId: string, index: number) => {
      const base = `${prefix}${layerId}Slide`;
      const stabilizedClass =
        index === stabilizedIndexRef.current
          ? `${prefix}${layerId}Stabilized`
          : "";
      const transparentClass = `${prefix}${layerId}Transparent`;
      return [
        styles?.[`${layerId}Slide`],
        base,
        stabilizedClass,
        transparentClass,
      ]
        .filter(Boolean)
        .join(" ");
    };

    return (
      <>
        {layers.map((layer) => {
          const isMaster = layer.type === "master";
          const layerRef = isMaster ? masterCarouselRef : layerRefs[layer.id];

          return (
            <Carousel
              key={layer.id}
              ref={layerRef as React.Ref<CarouselRef>}
              slides={layer.slides.map((slide, index) => (
                <div key={index} className={getSlideClass(layer.id, index)}>
                  {slide}
                </div>
              ))}
              slideSpacing={layer.spacing}
              initialIndex={initialIndex}
              wrapperClassName={getWrapperClass(layer.id)}
              slideClassName={`${prefix}${layer.id}SlideWrapper`}
              id={layer.id}
              isSlaveMode={!isMaster}
              onScrollUpdate={isMaster ? handleScrollUpdate : undefined}
              onStabilizationUpdate={
                isMaster ? handleStabilizationUpdate : undefined
              }
              debug={0}
            />
          );
        })}
      </>
    );
  },
);

LayeredCarouselManager.displayName = "LayeredCarouselManager";

export default LayeredCarouselManager;
