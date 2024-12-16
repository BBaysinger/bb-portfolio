import React, { useRef, useEffect, useCallback } from "react";

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
      className={`${styles["carousel"]} bb-parallax-carousel`}
      ref={containerRef}
    >
      <Carousel
        slides={layer1Slides}
        onIndexUpdate={handleScrollUpdate}
        slideWidth={693}
        debug={true}
      />
      {/* <div className={`${styles["slide-layer"]} bb-slide-layer`}>
        {layer1Slides.map((slide, index) => (
          <React.Fragment key={index}>{slide}</React.Fragment>
        ))}
      </div> */}
      <div className={`${styles["slide-layer"]} bb-slide-layer`}>
        {layer2Slides.map((slide, index) => (
          <React.Fragment key={index}>{slide}</React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProjectParallaxCarousel;
