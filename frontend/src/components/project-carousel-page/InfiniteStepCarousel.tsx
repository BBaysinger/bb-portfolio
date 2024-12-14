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
  const phantomRefs = useRef<HTMLDivElement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isTouching, setIsTouching] = useState(false);

  const totalSlides = slides.length;

  // Prevent recursive `onScrollUpdate` calls
  const updateCurrentIndex = useCallback(
    (newIndex: number) => {
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
        if (onScrollUpdate) {
          onScrollUpdate(newIndex);
        }
      }
    },
    [currentIndex, onScrollUpdate],
  );

  // Determine if a slide should have the "adjacent" or "active" class
  const getSlideClassName = (index: number): string => {
    if (index === currentIndex) return styles["active"];
    else if (index === (currentIndex - 1 + totalSlides) % totalSlides) {
      return `${styles["adjacent"]} ${styles["left"]}`;
    } else if (index === (currentIndex + 1) % totalSlides) {
      return `${styles["adjacent"]} ${styles["right"]}`;
    }
    return "";
  };

  // Handle intersection detection for phantom slides
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!isTouching) {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio === 1) {
              const phantomIndex = phantomRefs.current.indexOf(
                entry.target as HTMLDivElement,
              );
              if (phantomIndex !== -1) {
                console.log(
                  `Phantom slide ${phantomIndex + 1} is fully visible`,
                );
              }
            }
          });
        }
      },
      {
        root: containerRef.current,
        threshold: 1.0, // Fully visible
      },
    );

    phantomRefs.current.forEach((phantomSlide) =>
      observer.observe(phantomSlide),
    );

    return () => {
      observer.disconnect();
    };
  }, [isTouching]);

  // Touch events
  const handleTouchStart = () => setIsTouching(true);
  const handleTouchEnd = () => setIsTouching(false);

  return (
    <div
      ref={containerRef}
      className={`${styles["step-carousel"]} bb-infinite-step-carousel`}
      style={{
        display: "flex",
        overflowX: "scroll",
        scrollSnapType: "x mandatory",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handleTouchStart}
      onPointerUp={handleTouchEnd}
    >
      {/* Static phantom slides just for controlling the interaction */}
      {[1, 2, 3].map((number, idx) => (
        <div
          key={number}
          ref={(el) => {
            if (el) phantomRefs.current[idx] = el; // Explicitly assign without returning
          }}
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
