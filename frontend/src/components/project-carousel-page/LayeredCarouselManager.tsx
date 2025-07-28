import React, { forwardRef, useImperativeHandle, useRef, useMemo } from "react";

import Carousel from "./Carousel";
import { CarouselRef, DirectionType, SourceType } from "./CarouselTypes";
import styles from "./LayeredCarouselManager.module.scss";

export interface CarouselLayerConfig {
  id: string;
  spacing: number;
  slides: React.ReactNode[];
  multiplier?: number;
  type: "slave" | "master";
}

export interface LayeredCarouselManagerProps {
  layers: CarouselLayerConfig[];
  prefix?: string;
  styleMap?: { [key: string]: string };
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
      styleMap,
      initialIndex = 0,
      onScrollUpdate,
      onStabilizationUpdate,
    },
    ref,
  ) => {
    const stabilizedIndexRef = useRef<number | null>(initialIndex);
    const masterCarouselRef = useRef<CarouselRef | null>(null);

    const getClass = (
      layerId: string,
      suffix: string,
      fallback = "",
    ): string => {
      const key = `${layerId}${suffix}`;
      if (!layerId || !prefix) return fallback;
      return styleMap?.[key] ?? `${prefix}${key}`;
    };

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

    const wrapperClass = styles.LayeredCarouselManager;

    return (
      <div className={wrapperClass}>
        {layers.map((layer) => {
          const isMaster = layer.type === "master";
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
                    className={[
                      getClass(layer.id, "Slide"),
                      isStabilized ? getClass(layer.id, "Stabilized") : "",
                      getClass(layer.id, "Transparent"),
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {slide}
                  </div>
                );
              })}
              slideSpacing={layer.spacing}
              initialIndex={initialIndex}
              wrapperClassName={getClass(layer.id, "Carousel")}
              slideClassName={getClass(layer.id, "SlideWrapper")}
              classNamePrefix={prefix}
              styleMap={styleMap ?? styles}
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
