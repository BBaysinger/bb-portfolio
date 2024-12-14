import React, { useRef, useState, useEffect, useCallback } from "react";
import styles from "./InfiniteStepCarousel.module.scss";

interface InfiniteStepCarouselProps {
  slides: React.ReactNode[];
  initialIndex?: number;
  onIndexUpdate?: (currentIndex: number) => void;
}

const InfiniteStepCarousel: React.FC<InfiniteStepCarouselProps> = ({
  slides,
  initialIndex = 0,
  onIndexUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [slideWidth, setSlideWidth] = useState(0);

  const totalSlides = slides.length;

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      setSlideWidth(container.offsetWidth);
    }
  }, []);

  useEffect(() => {
    if (containerRef.current && slideWidth > 0) {
      const container = containerRef.current;
      container.scrollLeft = (initialIndex + 1) * slideWidth;
    }
  }, [initialIndex, slideWidth]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || slideWidth === 0) return;

    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;

    const newIndex = Math.round(scrollLeft / slideWidth) - 1;

    if (newIndex !== currentIndex) {
      const boundedIndex =
        newIndex < 0 ? totalSlides - 1 : newIndex >= totalSlides ? 0 : newIndex;
      setCurrentIndex(boundedIndex);
      if (onIndexUpdate) onIndexUpdate(boundedIndex);
    }
  }, [currentIndex, totalSlides, onIndexUpdate, slideWidth]);

  const repositionSlides = useCallback(() => {
    if (!containerRef.current || slideWidth === 0) return;

    const container = containerRef.current;

    if (currentIndex === -1) {
      container.style.transition = "none";
      container.scrollLeft = slideWidth * totalSlides;
      setTimeout(() => (container.style.transition = ""), 0);
    } else if (currentIndex === totalSlides) {
      container.style.transition = "none";
      container.scrollLeft = slideWidth;
      setTimeout(() => (container.style.transition = ""), 0);
    }
  }, [currentIndex, totalSlides, slideWidth]);

  useEffect(() => {
    repositionSlides();
  }, [currentIndex, repositionSlides]);

  return (
    <div
      ref={containerRef}
      className={`${styles["step-carousel"]} bb-infinite-step-carousel`}
      onScroll={handleScroll}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles["carousel-slide"]}`}
          style={{ left: slideWidth * index + "px" }}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default InfiniteStepCarousel;
