import React, { useRef, useEffect, useCallback } from "react";

import styles from "./ParallaxStepCarousel.module.scss";

interface ParallaxStepCarouselProps {
  layer1Slides: React.ReactNode[];
  layer2Slides: React.ReactNode[];
  onScrollUpdate?: (scrollOffset: number) => void;
}

const ParallaxStepCarousel: React.FC<ParallaxStepCarouselProps> = ({
  layer1Slides,
  layer2Slides,
  onScrollUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      className={`${styles["carousel"]} bb-parallax-step-carousel`}
      ref={containerRef}
    >
      {layer1Slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles["slide"]} ${styles["slide-layer-1"]} bb-slide bb-slide-layer-1`}
        >
          {slide}
        </div>
      ))}
      {layer2Slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles["slide"]} ${styles["slide-layer-2"]} bb-slide bb-slide-layer-2`}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default ParallaxStepCarousel;
