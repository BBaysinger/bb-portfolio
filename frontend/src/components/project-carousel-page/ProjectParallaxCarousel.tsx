import React, { useRef, useEffect, useCallback, useMemo } from "react";

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

  function getRandomColorWithOpacity(opacity = 0.1) {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  function generateColorArray(length: number, opacity = 0.1) {
    return Array.from({ length }, () => getRandomColorWithOpacity(opacity));
  }

  const _colorArray = generateColorArray(layer1Slides.length, 0.1);
  void _colorArray;

  // Memoize layer1Slides and layer2Slides
  const memoizedLayer1Slides = useMemo(
    () => layer1Slides.map((slide, _) => ({ slide })),
    [layer1Slides],
  );

  const memoizedLayer2Slides = useMemo(
    () => layer2Slides.map((slide, _) => ({ slide })),
    [layer2Slides],
  );

  return (
    <div
      className={`${styles["carousel"]} bb-project-parallax-carousel`}
      ref={containerRef}
    >
      {/* {memoizedLayer1Slides}
        {memoizedLayer2Slides} */}
    </div>
  );
};

export default ProjectParallaxCarousel;
