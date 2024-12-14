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
      setSlideWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    if (containerRef.current && slideWidth > 0) {
      containerRef.current.scrollLeft = (initialIndex + 1) * slideWidth;
    }
  }, [initialIndex, slideWidth]);

  useEffect(() => {
    if (onIndexUpdate) {
      console.log(currentIndex);
      onIndexUpdate(currentIndex);
    }
  }, [currentIndex, onIndexUpdate]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || slideWidth === 0) return;

    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;

    const newIndex = Math.round(scrollLeft / slideWidth) - 1;

    if (newIndex !== currentIndex) {
      const boundedIndex = (newIndex + totalSlides) % totalSlides;
      setCurrentIndex(boundedIndex);
    }
  }, [currentIndex, slideWidth, totalSlides]);

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
          style={{
            left: (index + 1) * slideWidth + "px",
            width: slideWidth + "px",
          }}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default InfiniteStepCarousel;
