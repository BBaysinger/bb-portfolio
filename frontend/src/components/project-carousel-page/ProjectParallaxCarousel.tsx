import React, { useRef, useEffect, useCallback } from "react";

import { Swiper, SwiperSlide } from "swiper/react";

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

  return (
    <div
      className={`${styles["carousel"]} bb-project-parallax-carousel`}
      ref={containerRef}
    >
      <Swiper spaceBetween={10} slidesPerView={1} loop={true}>
        {/*
        <SwiperSlide>Slide 1</SwiperSlide>
        <SwiperSlide>Slide 2</SwiperSlide>
        <SwiperSlide>Slide 3</SwiperSlide>
        */}

        {layer1Slides.map((slide, index) => (
          <SwiperSlide key={index}>{slide}</SwiperSlide>
        ))}
        {layer2Slides.map((slide, index) => (
          <SwiperSlide key={index}>{slide}</SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ProjectParallaxCarousel;
