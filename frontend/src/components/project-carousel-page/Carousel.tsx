import React, { useRef, useState, useEffect, useCallback } from "react";
import styles from "./Carousel.module.scss";

const BASE_OFFSET = 100000;

interface CarouselProps {
  slides: React.ReactNode[];
  slideWidth: number; // Provided by the parent
  initialIndex?: number;
  onIndexUpdate?: (currentIndex: number) => void;
}

const Carousel: React.FC<CarouselProps> = ({
  slides,
  slideWidth,
  initialIndex = 0,
  onIndexUpdate,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [previousIndex, setPreviousIndex] = useState(NaN);
  const [positions, setPositions] = useState<number[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);
  const totalSlides = slides.length;

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = BASE_OFFSET;
    }
  }, []);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = (initialIndex + 1) * slideWidth;
    }
  }, [initialIndex, slideWidth]);

  const computeRightPositions = () => {
    const threshold = 1;
    const newPositions: number[] = [];
    const newOffsets: number[] = [];
    slides.forEach((_, index) => {
      const offset = Math.floor(
        (index - currentIndex + threshold) / totalSlides,
      );
      newOffsets.push(offset);
      newPositions.push(
        -offset * (slideWidth * slides.length) + index * slideWidth,
      );
    });

    setOffsets(newOffsets);
    setPositions(newPositions);
    console.info("Right scroll:", newOffsets);
    console.info("Right Positions:", newPositions);
  };

  const computeLeftPositions = () => {
    const threshold = 1;
    const newPositions: number[] = [];
    const newOffsets: number[] = [];
    slides.forEach((_, index) => {
      const offset = Math.floor(
        (index - currentIndex + threshold) / totalSlides,
      );
      newOffsets.push(offset);
      newPositions.push(
        -offset * (slideWidth * slides.length) + index * slideWidth,
      );
    });

    setOffsets(newOffsets);
    setPositions(newPositions);
    console.info("Left scroll:", newOffsets);
    console.info("Left Positions:", newPositions);
  };

  useEffect(() => {
    if (onIndexUpdate) {
      if (currentIndex > previousIndex) {
        computeRightPositions();
      } else if (currentIndex < previousIndex) {
        computeLeftPositions();
      }
    }
  }, [
    currentIndex,
    onIndexUpdate,
    slideWidth,
    slides,
    totalSlides,
    previousIndex,
  ]);

  useEffect(() => {
    // Call the right() logic once after mount
    computeRightPositions();
  }, [currentIndex, onIndexUpdate, slideWidth, slides, totalSlides]);

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current) return;

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
            left: positions[index] + "px",
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
