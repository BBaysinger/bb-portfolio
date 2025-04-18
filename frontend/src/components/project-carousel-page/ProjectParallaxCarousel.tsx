import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  memo,
} from "react";

import Carousel from "./Carousel";
import { DirectionType, CarouselRef, SourceType } from "./CarouselTypes";
import styles from "./ProjectParallaxCarousel.module.scss";

/**
 * ProjectParallaxCarousel is a layered carousel component with three carousels:
 * 1. The **master carousel** acts as the control layer, determining scroll positions and indices.
 * 2. Two **parallaxing carousels** (layer 1 and layer 2) are visually offset and move at different speeds
 *    for a parallax effect, creating depth and a dynamic visual presentation.
 *
 * Props:
 * - `initialIndex` Which slide to start at on initial render.
 * - `layer1Slides` (React.ReactNode[]): Slides for the first parallax layer.
 * - `layer2Slides` (React.ReactNode[]): Slides for the second parallax layer.
 * - `onScrollUpdate` (function): Callback for when the master carousel's scroll position updates.
 * - `onStabilizationUpdate` (function): Callback for when a stable slide index is reached.
 */
const ProjectParallaxCarousel = memo(
  forwardRef<
    { scrollToSlide: (targetIndex: number) => void },
    ProjectParallaxCarouselProps
  >(
    (
      {
        initialIndex = 0,
        layer1Slides,
        layer2Slides,
        onScrollUpdate,
        onStabilizationUpdate,
      },
      ref,
    ) => {
      const dynamicTransformRef = useRef("");
      const stabilizedIndexRef = useRef<number | null>(initialIndex);
      const currentIndexRef = useRef(initialIndex);
      const layer1CarouselRef = useRef<CarouselRef>(null);
      const masterCarouselRef = useRef<CarouselRef>(null);
      const layer2CarouselRef = useRef<CarouselRef>(null);

      // Spacing for each carousel layer, allowing different movement speeds for the parallax effect
      const slideSpacings = {
        layer1: 693,
        master: 720,
        layer2: 900,
      };

      // Multipliers to adjust the parallax scrolling effect for each layer
      const layerMultipliers = {
        layer1: slideSpacings.layer1 / slideSpacings.master,
        layer2: slideSpacings.layer2 / slideSpacings.master,
      };

      /**
       * Dynamically calculates and applies the appropriate scale transformation
       * based on the window width and existing `translateX` from external styles.
       */
      const updateTransform = () => {
        const element = document.querySelector(
          `.${styles.parallaxCarousel}`,
        ) as HTMLElement; // Cast to HTMLElement
        if (!element) return;

        const computedStyle = getComputedStyle(element);
        const transformMatrix = computedStyle.transform;

        // Extract the `translateX` value from the computed transform matrix
        const matrixValues = transformMatrix
          .match(/matrix.*\((.+)\)/)?.[1]
          .split(", ");
        const translateX = matrixValues ? parseFloat(matrixValues[4]) || 0 : 0;

        // Calculate the dynamic scale based on window width
        const minWidth = 320;
        const maxWidth = 680;
        const minScale = 0.4755;
        const maxScale = 1;

        const currentWidth = window.innerWidth;
        const newScale = Math.max(
          minScale,
          Math.min(
            maxScale,
            minScale +
              ((currentWidth - minWidth) / (maxWidth - minWidth)) *
                (maxScale - minScale),
          ),
        );

        // Update the dynamic transformation state
        dynamicTransformRef.current = `translateX(${translateX}px) scale(${newScale})`;
        element.style.transform = dynamicTransformRef.current;
      };

      /**
       * Handles updates to the master carousel's scroll position.
       * Updates the `masterScrollLeft` state and calls the `onScrollUpdate` prop if provided.
       */
      const handleMasterScrollLeft = (scrollLeft: number) => {
        layer1CarouselRef.current?.setExternalScrollPosition(
          scrollLeft * layerMultipliers.layer1,
        );
        layer2CarouselRef.current?.setExternalScrollPosition(
          scrollLeft * layerMultipliers.layer2,
        );
        if (onScrollUpdate) onScrollUpdate(scrollLeft);
      };

      /**
       * Handles when a stable index is reached in the master carousel.
       * Updates the `stabilizedIndex` state and calls the `onStableIndex` prop if provided.
       */
      const handleStabilizationUpdate = (
        index: number,
        source: SourceType,
        direction: DirectionType,
      ) => {
        stabilizedIndexRef.current = index;
        if (onStabilizationUpdate)
          onStabilizationUpdate(index, source, direction);
      };

      // Updates the transform dynamically on component mount and window resize
      useEffect(() => {
        updateTransform();
        window.addEventListener("resize", updateTransform);
        return () => window.removeEventListener("resize", updateTransform);
      }, []);

      // Exposes a `scrollToSlide` method for external control via the ref
      useImperativeHandle(ref, () => ({
        scrollToSlide: (targetIndex: number) => {
          masterCarouselRef.current?.scrollToSlide(targetIndex);
        },
      }));

      /**
       * Generates the class name for slides, adding styles for stabilization.
       */
      const getSlideClass = (index: number) =>
        (index === stabilizedIndexRef.current
          ? `${styles.stabilizedSlide} bbStabilizedSlide`
          : "") + ` bbTransparentSlide`;

      return (
        <div
          className={
            `${styles.parallaxCarousel} bbParallaxCarousel ` +
            (currentIndexRef.current === stabilizedIndexRef.current
              ? "bbStabilizedCarousel"
              : "")
          }
        >
          {/* Layer 1: Parallax carousel for display */}
          <Carousel
            ref={layer1CarouselRef}
            slides={layer1Slides.map((slide, index) => (
              <div key={index} className={getSlideClass(index)}>
                {slide}
              </div>
            ))}
            slideSpacing={slideSpacings.layer1}
            debug={0}
            initialIndex={initialIndex}
            wrapperClassName={"bbCarousel bbCarouselLaptops"}
            id="laptops"
            isSlaveMode={true}
          />

          {/* Master Layer: Controls scroll and index synchronization */}
          <Carousel
            ref={masterCarouselRef}
            slides={layer1Slides.map((_, _index) => null)}
            slideSpacing={slideSpacings.master}
            onScrollUpdate={handleMasterScrollLeft}
            onStabilizationUpdate={handleStabilizationUpdate}
            debug={0}
            initialIndex={initialIndex}
            wrapperClassName={"bbCarousel bbCarouselMaster"}
            slideClassName={"bbSlideWrapper"}
            id="master"
            isSlaveMode={false}
          />

          {/* Layer 2: Parallax carousel for display */}
          <Carousel
            ref={layer2CarouselRef}
            slides={layer2Slides.map((slide, index) => (
              <div key={index} className={getSlideClass(index)}>
                {slide}
              </div>
            ))}
            slideSpacing={slideSpacings.layer2}
            debug={0}
            initialIndex={initialIndex}
            wrapperClassName={"bbCarousel bbCarouselPhones"}
            id="phones"
            isSlaveMode={true}
          />
        </div>
      );
    },
  ),
);

interface ProjectParallaxCarouselProps {
  initialIndex?: number;
  layer1Slides: React.ReactNode[];
  layer2Slides: React.ReactNode[];
  onScrollUpdate?: (scrollLeft: number) => void;
  onStabilizationUpdate?: (
    index: number,
    source: SourceType,
    direction: DirectionType,
  ) => void;
}

export default ProjectParallaxCarousel;
