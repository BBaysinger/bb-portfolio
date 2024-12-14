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

  const totalSlides = slides.length;
  const scrollTimeout = useRef<number | null>(null);

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

  const handleScrollStop = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, offsetWidth } = containerRef.current;

      // Calculate the width of a single slide
      const slideWidth = offsetWidth;

      // Scrolling past the end
      if (scrollLeft >= scrollWidth - offsetWidth) {
        const newIndex = Math.round(scrollLeft / offsetWidth) % totalSlides;
        updateCurrentIndex(newIndex);
        containerRef.current.scrollLeft = slideWidth; // Adjust to middle phantom
      }
      // Scrolling past the beginning
      else if (scrollLeft <= 0) {
        const newIndex = Math.round(scrollLeft / offsetWidth) % totalSlides;
        updateCurrentIndex(newIndex);
        containerRef.current.scrollLeft = slideWidth; // Adjust to middle phantom
      }
    }
  }, [totalSlides, updateCurrentIndex]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = window.setTimeout(handleScrollStop, 150); // Adjust delay as needed
    }
  }, [handleScrollStop]);

  useEffect(() => {
    if (containerRef.current && phantomRefs.current[1]) {
      const phantomSlide = phantomRefs.current[1];
      const offset = phantomSlide.offsetLeft - containerRef.current.offsetLeft;

      containerRef.current.scrollTo({
        left: offset,
        behavior: "auto",
      });
    }
  }, []);

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
      style={{
        display: "flex",
        overflowX: "scroll",
        scrollSnapType: "x mandatory",
      }}
      onScroll={handleScroll}
    >
      {/* Phantom slides for seamless infinite scroll */}
      {[1, 2, 3].map((number, id) => (
        <div
          key={number}
          ref={(el) => {
            if (el) phantomRefs.current[id] = el;
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
