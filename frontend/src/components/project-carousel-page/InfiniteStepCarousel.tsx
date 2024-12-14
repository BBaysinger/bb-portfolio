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

  const getSlideClassName = (index: number): string => {
    if (index === currentIndex) return styles["active"];
    else if (index === (currentIndex - 1 + totalSlides) % totalSlides) {
      return `${styles["adjacent"]} ${styles["left"]}`;
    } else if (index === (currentIndex + 1) % totalSlides) {
      return `${styles["adjacent"]} ${styles["right"]}`;
    }
    return "";
  };

  // Scroll instantly to the second phantom slide before user interaction
  useEffect(() => {
    if (containerRef.current && phantomRefs.current[1]) {
      const phantomSlide = phantomRefs.current[1];
      const offset = phantomSlide.offsetLeft - containerRef.current.offsetLeft;

      // Scroll instantly without animation
      containerRef.current.scrollTo({
        left: offset,
        behavior: "auto", // No animation
      });
    }
  }, []); // Empty dependency array ensures this runs only once

  useEffect(() => {
    const container = containerRef.current; // Store the ref value to avoid re-accessing it

    if (!container) return;

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

                // Reset scroll instantly to the second phantom slide (index 1)
                if (phantomIndex === 0 || phantomIndex === 2) {
                  const targetSlide = phantomRefs.current[1]; // Second phantom slide
                  if (targetSlide) {
                    const offset =
                      targetSlide.offsetLeft - container.offsetLeft;

                    container.scrollTo({
                      left: offset,
                      behavior: "auto", // Instant scroll back
                    });
                  }
                }
              }
            }
          });
        }
      },
      {
        root: container,
        threshold: 1.0,
      },
    );

    phantomRefs.current.forEach((phantomSlide) => {
      if (phantomSlide) observer.observe(phantomSlide);
    });

    return () => {
      observer.disconnect();
    };
  }, [isTouching]);

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
      {[1, 2, 3].map((number, idx) => (
        <div
          key={number}
          ref={(el) => {
            if (el) phantomRefs.current[idx] = el;
          }}
          className={`${styles["phantom-slide"]} phantom-slide`}
        >
          {number}
        </div>
      ))}

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
