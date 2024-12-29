import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";

import Carousel, { CarouselRef } from "./Carousel";
import styles from "./ProjectParallaxCarousel.module.scss";

interface ProjectParallaxCarouselProps {
  initialIndex?: number;
  layer1Slides: React.ReactNode[];
  layer2Slides: React.ReactNode[];
  onScrollUpdate?: (scrollLeft: number) => void;
  onStableIndex?: (stableIndex: number) => void;
  onIndexUpdate?: (currentIndex: number) => void;
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
    },
    ref,
  ) => {
    const [dynamicTransform, setDynamicTransform] = useState(""); // Holds the combined translateX and scale transformations
    const masterCarouselRef = useRef<CarouselRef>(null); // Reference to the master carousel for programmatic control

    // State variables for carousel tracking
    const [masterScrollLeft, setMasterScrollLeft] = useState<number>(0);
    const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(
      initialIndex,
    );
    const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

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
      const element = document.querySelector(`.${styles["parallax-carousel"]}`);
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
      setDynamicTransform(`translateX(${translateX}px) scale(${newScale})`);
    };

    /**
     * Handles updates to the master carousel's scroll position.
     * Updates the `masterScrollLeft` state and calls the `onScrollUpdate` prop if provided.
     */
    const handleMasterScrollLeft = (scrollLeft: number) => {
      setMasterScrollLeft(scrollLeft);
      if (onScrollUpdate) onScrollUpdate(scrollLeft);
    };

    /**
     * Handles when a stable index is reached in the master carousel.
     * Updates the `stabilizedIndex` state and calls the `onStableIndex` prop if provided.
     */
    const handleStableIndex = (index: number) => {
      setStabilizedIndex(index);
      if (onStableIndex) onStableIndex(index);
    };

    /**
     * Handles updates to the current active index in the master carousel.
     * Clears the stabilized index and calls the `onIndexUpdate` prop if provided.
     */
    const handleIndexUpdate = (index: number) => {
      setStabilizedIndex(null);
      setCurrentIndex(index);
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
      (index === stabilizedIndex
        ? `${styles["stabilized-slide"]} bb-stabilized-slide`
        : "") + ` bb-transparent-slide`;

    return (
      <div
        className={
          `${styles["parallax-carousel"]} bb-parallax-carousel ` +
          (currentIndex === stabilizedIndex ? "bb-stabilized-carousel" : "")
        }
        style={{ transform: dynamicTransform }}
      >
        {/* Layer 1: Parallax carousel for display */}
        <Carousel
          slides={layer1Slides.map((slide, index) => (
            <div key={index} className={getSlideClass(index)}>
              {slide}
            </div>
          ))}
          slideSpacing={slideSpacings.layer1}
          externalScrollLeft={
            masterScrollLeft * layerMultipliers.layer1
          }
          debug={1}
          initialIndex={initialIndex}
          wrapperClassName={"bb-carousel bb-carousel-laptops"}
        />

        {/* Master Layer: Controls scroll and index synchronization */}
        <Carousel
          ref={masterCarouselRef}
          slides={layer1Slides.map((_, _index) => null)}
          slideSpacing={slideSpacings.master}
          onScrollUpdate={handleMasterScrollLeft}
          onStableIndex={handleStableIndex}
          onIndexUpdate={handleIndexUpdate}
          debug={2}
          initialIndex={initialIndex}
          wrapperClassName={"bb-carousel bb-carousel-master"}
          slideClassName={"bb-slide-wrapper"}
        />

        {/* Layer 2: Parallax carousel for display */}
        <Carousel
          slides={layer2Slides.map((slide, index) => (
            <div key={index} className={getSlideClass(index)}>
              {slide}
            </div>
          ))}
          slideSpacing={slideSpacings.layer2}
          externalScrollLeft={
            masterScrollLeft * layerMultipliers.layer2
          }
          debug={3}
          initialIndex={initialIndex}
          wrapperClassName={"bb-carousel bb-carousel-phones"}
        />
      </div>
    );
  },
);

export default ProjectParallaxCarousel;
