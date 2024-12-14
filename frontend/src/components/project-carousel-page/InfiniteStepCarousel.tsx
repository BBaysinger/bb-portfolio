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

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft } = containerRef.current;

      if (onScrollPositionUpdate) {
        onScrollPositionUpdate(scrollLeft);
      }
    }
  }, [onScrollPositionUpdate]);

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
          className={`${styles["carousel-slide"]} carousel-slide`}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default InfiniteStepCarousel;
