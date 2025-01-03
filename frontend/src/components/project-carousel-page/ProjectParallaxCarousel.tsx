import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

import Carousel, { DirectionType, CarouselRef } from "./Carousel";
import styles from "./ProjectParallaxCarousel.module.scss";

interface ProjectParallaxCarouselProps {
  initialIndex?: number;
  layer1Slides: React.ReactNode[];
  layer2Slides: React.ReactNode[];
  onScrollUpdate?: (scrollLeft: number) => void;
  onStableIndex?: (stableIndex: number | null) => void;
  onIndexUpdate?: (currentIndex: number) => void;
  onDirectionChange?: (direction: DirectionType) => void;
}

/**
 * ProjectParallaxCarousel is a layered carousel component with three carousels:
 * 1. The **master carousel** acts as the control layer, determining scroll positions and indices.
 * 2. Two **parallaxing carousels** (layer 1 and layer 2) are visually offset and move at different speeds
 *    for a parallax effect, creating depth and a dynamic visual presentation.
 *
 * Props:
 * - `layer1Slides` (React.ReactNode[]): Slides for the first parallax layer.
 * - `layer2Slides` (React.ReactNode[]): Slides for the second parallax layer.
 * - `onScrollUpdate` (function): Callback for when the master carousel's scroll position updates.
 * - `onStableIndex` (function): Callback for when a stable slide index is reached.
 * - `onIndexUpdate` (function): Callback for when the current active index changes.
 */
const ProjectParallaxCarousel = forwardRef<
  { scrollToSlide: (targetIndex: number) => void },
  ProjectParallaxCarouselProps
>(
  (
    {
      initialIndex = 0,
      layer1Slides,
      layer2Slides,
      onScrollUpdate,
      onStableIndex,
      onIndexUpdate,
      onDirectionChange,
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
        `.${styles["parallax-carousel"]}`,
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
    const handleStableIndex = (index: number | null) => {
      stabilizedIndexRef.current = index;
      if (onStableIndex) onStableIndex(index);
    };

    /**
     * Handles updates to the current active index in the master carousel.
     * Clears the stabilized index and calls the `onIndexUpdate` prop if provided.
     */
    const handleIndexUpdate = (index: number) => {
      stabilizedIndexRef.current = null;
      currentIndexRef.current = index;
      if (onIndexUpdate) onIndexUpdate(index);
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
        ? `${styles["stabilized-slide"]} bb-stabilized-slide`
        : "") + ` bb-transparent-slide`;

    return (
      <div
        className={
          `${styles["parallax-carousel"]} bb-parallax-carousel ` +
          (currentIndexRef.current === stabilizedIndexRef.current
            ? "bb-stabilized-carousel"
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
          wrapperClassName={"bb-carousel bb-carousel-laptops"}
          id="laptops"
        />

        {/* Master Layer: Controls scroll and index synchronization */}
        <Carousel
          ref={masterCarouselRef}
          slides={layer1Slides.map((_, _index) => null)}
          slideSpacing={slideSpacings.master}
          onScrollUpdate={handleMasterScrollLeft}
          onStableIndex={handleStableIndex}
          onIndexUpdate={handleIndexUpdate}
          onDirectionChange={onDirectionChange}
          debug={0}
          initialIndex={initialIndex}
          wrapperClassName={"bb-carousel bb-carousel-master"}
          slideClassName={"bb-slide-wrapper"}
          id="master"
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
          wrapperClassName={"bb-carousel bb-carousel-phones"}
          id="phones"
        />
      </div>
    );
  },
);

export default ProjectParallaxCarousel;
