import React, { useRef, useCallback, useState } from "react";
import styles from "./InfiniteStepCarousel.module.scss";

interface InfiniteStepCarouselProps {
  slides: React.ReactNode[];
  initialIndex?: number;
  onIndexUpdate?: (currentIndex: number) => void;
  onScrollPositionUpdate?: (scrollPosition: number) => void; // New Prop
}

const InfiniteStepCarousel: React.FC<InfiniteStepCarouselProps> = ({
  slides,
  initialIndex = 0,
  onIndexUpdate,
  onScrollPositionUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const totalSlides = slides.length;
  const scrollTimeout = useRef<number | null>(null);

  const updateCurrentIndex = useCallback(
    (newIndex: number) => {
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        if (onIndexUpdate) {
          onIndexUpdate(newIndex);
        }
      }
    },
    [currentIndex, onIndexUpdate],
  );

  const handleScrollStop = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, offsetWidth } = containerRef.current;
      if (scrollLeft === scrollWidth - offsetWidth) {
        const newIndex = (currentIndex + 1) % totalSlides;
        updateCurrentIndex(newIndex);
        containerRef.current.scrollLeft = offsetWidth;
      } else if (scrollLeft === 0) {
        const newIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateCurrentIndex(newIndex);
        containerRef.current.scrollLeft = offsetWidth;
      }
    }
  }, [currentIndex, totalSlides, updateCurrentIndex]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft } = containerRef.current;

      if (onScrollPositionUpdate) {
        onScrollPositionUpdate(scrollLeft);
      }

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = window.setTimeout(handleScrollStop, 0);
    }
  }, [handleScrollStop, onScrollPositionUpdate]);

  const getSlideClassName = (index: number): string => {
    if (index === currentIndex) {
      return styles["active"];
    } else if (index === (currentIndex - 1 + totalSlides) % totalSlides) {
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
      onScroll={handleScroll}
    >
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
