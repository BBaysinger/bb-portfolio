import React, { useRef, useEffect, useCallback, useState } from "react";

import styles from "./InfiniteStepCarousel.module.scss";

interface InfiniteStepCarouselProps {
  slides: React.ReactNode[];
  initialIndex?: number;
  onScrollUpdate?: (currentIndex: number) => void;
}

const InfiniteStepCarousel: React.FC<InfiniteStepCarouselProps> = ({
  slides,
  initialIndex = 0,
  onScrollUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollTimeoutRef = useRef<number | null>(null);

  const totalSlides = slides.length;

  // Reset scroll position to center phantom slide
  const resetScrollPosition = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: containerRef.current.offsetWidth, // Second phantom slide
        behavior: "auto", // Instant reset
      });
    }
  }, []);

  // Update active slide index after scroll
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      if (containerRef.current) {
        const { scrollLeft, offsetWidth } = containerRef.current;

        // Determine which slide should be active
        const index = Math.round(scrollLeft / offsetWidth) - 1; // Offset for phantom slides
        const adjustedIndex = (index + totalSlides) % totalSlides;

        setCurrentIndex(adjustedIndex);
        if (onScrollUpdate) {
          onScrollUpdate(adjustedIndex);
        }

        resetScrollPosition();
      }
    }, 150); // Debounce timeout
  }, [onScrollUpdate, resetScrollPosition, totalSlides]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resetScrollPosition();

    // Add scroll event listener
    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, resetScrollPosition]);

  // Determine if a slide should have the "adjacent" or "active" class
  const getSlideClassName = (index: number) => {
    if (index === currentIndex) return styles["active"];
    else if (index === (currentIndex - 1 + totalSlides) % totalSlides) {
      return `${styles["adjacent"]} ${styles["left"]}`;
    } else if (index === (currentIndex + 1) % totalSlides) {
      return `${styles["adjacent"]} ${styles["right"]}`;
    }
    return "";
  };

  return (
    <div
      ref={containerRef}
      className={`${styles["step-carousel"]} bb-infinite-step-carousel`}
      style={{
        display: "flex",
        overflowX: "scroll",
        scrollSnapType: "x mandatory",
      }}
    >
      {/* Static phantom slides just for controlling the interaction */}
      {[1, 2, 3].map((number) => (
        <div
          key={number}
          className={`${styles["phantom-slide"]} phantom-slide`}
        >
          {number}
        </div>
      ))}

      {/* Actual slides with class-based visibility */}
      {slides.map((slide, index) => (
        <div
          key={index}
          data-index={index}
          className={`${styles["carousel-slide"]} carousel-slide ${getSlideClassName(index)}`}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default InfiniteStepCarousel;
