import React, { useRef, useState, useEffect, useCallback } from "react";

import styles from "./Carousel.module.scss";

const BASE_OFFSET = 100000;

interface CarouselProps {
  slides: React.ReactNode[];
  initialIndex?: number;
  onIndexUpdate?: (currentIndex: number) => void;
}

const Carousel: React.FC<CarouselProps> = ({
  slides,
  initialIndex = 0,
  onIndexUpdate,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [previousIndex, setPreviousIndex] = useState(NaN);
  const [slideWidth, setSlideWidth] = useState(0);
  const [positions, setPositions] = useState<number[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);
  const totalSlides = slides.length;

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = BASE_OFFSET;
      setSlideWidth(scrollerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    if (scrollerRef.current && slideWidth > 0) {
      scrollerRef.current.scrollLeft = (initialIndex + 1) * slideWidth;
    }
  }, [initialIndex, slideWidth]);

  useEffect(() => {
    const right = () => {
      const threshold = 1;
      const positions: number[] = [];
      const offsets: number[] = [];
      slides.forEach((_, index) => {
        const offset = Math.floor(
          (index - currentIndex + threshold) / totalSlides,
        );
        offsets.push(offset);
        positions.push(
          -offset * (slideWidth * slides.length) + index * slideWidth,
        );
      });

      setOffsets(offsets);
      setPositions(positions);
      console.info("Right scroll:", offsets);
      console.info("Right Positions:", positions);
    };

    const left = () => {
      const threshold = 1;
      const positions: number[] = [];
      const offsets: number[] = [];
      slides.forEach((_, index) => {
        const offset = Math.floor(
          (index - currentIndex + threshold) / totalSlides,
        );
        offsets.push(offset);
        positions.push(
          -offset * (slideWidth * slides.length) + index * slideWidth,
        );
      });

      setOffsets(offsets);
      setPositions(positions);
      console.info("Left scroll:", offsets);
    };

    if (onIndexUpdate) {
      if (currentIndex > previousIndex) {
        left();
      } else if (currentIndex < previousIndex) {
        right();
      }
    }

    // Always recompute for debugging and state tracking
    right();
  }, [
    currentIndex,
    onIndexUpdate,
    slideWidth,
    slides,
    totalSlides,
    previousIndex,
  ]);

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current || slideWidth === 0) return;

    const scrollLeft = scrollerRef.current.scrollLeft;
    const scrollOffset = scrollLeft - BASE_OFFSET;

    const newIndex = Math.round(scrollOffset / slideWidth);

    if (newIndex !== currentIndex) {
      setPreviousIndex(currentIndex);
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, slideWidth]);

  return (
    <div
      ref={scrollerRef}
      className={`${styles["carousel"]} bb-carousel`}
      onScroll={handleScroll}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles["carousel-slide"]}`}
          style={{
            left: index * slideWidth + BASE_OFFSET + "px",

            // left: positions[index] + "px",
          }}
        >
          <div className={styles["debug-info"]}>
            <div>Index: {index}</div>
            <div>Offset: {offsets[index]}</div>
            <div>Position: {positions[index]}</div>
          </div>
          {slide}
        </div>
      ))}
    </div>
  );
};

export default Carousel;
