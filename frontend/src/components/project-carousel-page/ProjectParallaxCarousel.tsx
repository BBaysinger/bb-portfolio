import React, { useRef, useEffect, useCallback, useState } from "react";

import Carousel from "./Carousel";
import styles from "./ProjectParallaxCarousel.module.scss";

interface ProjectParallaxCarouselProps {
  layer1Slides: React.ReactNode[];
  layer2Slides: React.ReactNode[];
  onScrollUpdate?: (scrollOffset: number) => void;
}

const ProjectParallaxCarousel: React.FC<ProjectParallaxCarouselProps> = ({
  layer1Slides,
  layer2Slides,
  onScrollUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1); // Default scale

  /**
   * Tried everything to find a CSS variables or SCSS mixin way to
   * clamp/fluid scale the carousel, but hey, that's why we have JavaScript, right? 🤦‍♂️
   * TODO: Come back to this.
   */
  const updateScale = () => {
    const minWidth = 320; // Minimum viewport width
    const maxWidth = 1024; // Maximum viewport width
    const minScale = 0.45; // Minimum scale
    const maxScale = 1; // Maximum scale

    // Get current viewport width
    const currentWidth = window.innerWidth;

    // Calculate scale based on viewport width
    const newScale = Math.max(
      minScale,
      Math.min(
        maxScale,
        minScale +
          ((currentWidth - minWidth) / (maxWidth - minWidth)) *
            (maxScale - minScale),
      ),
    );

    setScale(newScale);
  };

  const handleScroll = useCallback(() => {
    if (containerRef.current && onScrollUpdate) {
      const scrollOffset = containerRef.current.scrollLeft;
      onScrollUpdate(scrollOffset);
    }
  }, [onScrollUpdate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  useEffect(() => {
    // Update scale on mount and resize
    updateScale();
    window.addEventListener("resize", updateScale);

    return () => window.removeEventListener("resize", updateScale); // Cleanup listener
  }, []);

  // function getRandomColorWithOpacity(opacity = 0.1) {
  //   const r = Math.floor(Math.random() * 256);
  //   const g = Math.floor(Math.random() * 256);
  //   const b = Math.floor(Math.random() * 256);
  //   return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  // }

  // function generateColorArray(length: number, opacity = 0.1) {
  //   return Array.from({ length }, () => getRandomColorWithOpacity(opacity));
  // }

  // const colorArray = generateColorArray(layer1Slides.length, 0.1);

  function handleScrollUpdate(scrollOffset: number) {
    // console.log("scrollOffset:", scrollOffset);

    if (onScrollUpdate) {
      onScrollUpdate(scrollOffset);
    }
  }

  // Map layer1Slides to generate an array of div elements for Carousel
  // const transparentSlides = layer1Slides.map((_, index) => (
  //   <div
  //     key={index}
  //     style={{ backgroundColor: colorArray[index] }}
  //     className={`${styles["transparent-slide"]}`}
  //   >
  //     {index + 1}
  //   </div>
  // ));

  return (
    <div
      className={`${styles["parallax-carousel"]} bb-parallax-carousel`}
      style={{ transform: `scale(${scale})` }}
      ref={containerRef}
    >
      <Carousel
        slides={layer1Slides}
        onIndexUpdate={handleScrollUpdate}
        slideWidth={693}
        debug={false}
        wrapperClassName="bb-carousel-laptops"
      />
      <Carousel
        slides={layer2Slides}
        onIndexUpdate={handleScrollUpdate}
        slideWidth={693}
        debug={false}
        wrapperClassName="bb-carousel-phones"
      />
    </div>
  );
};

export default ProjectParallaxCarousel;
