import React, { useRef, useState, useEffect, useCallback } from "react";

import styles from "./Carousel.module.scss";

const BASE_OFFSET = 100000;

const Direction = {
  LEFT: "Left",
  RIGHT: "Right",
} as const;

type DirectionType = (typeof Direction)[keyof typeof Direction];

interface CarouselProps {
  slides: React.ReactNode[];
  slideWidth: number;
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
  const [_previousIndex, setPreviousIndex] = useState(NaN);
  const [scrollDirection, setScrollDirection] = useState<DirectionType | null>(
    null,
  );
  const [positions, setPositions] = useState<number[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = BASE_OFFSET + initialIndex * slideWidth;
    }
  }, [initialIndex, slideWidth]);

  useEffect(() => {
    // Call 'computePositions' whenever the scroll direction changes
    if (scrollDirection) {
      computePositions(scrollDirection);
    }
  }, [scrollDirection]);

  const computePositions = (direction: DirectionType) => {
    const threshold = 1;
    const newPositions: number[] = [];
    const newOffsets: number[] = [];

    slides.forEach((_, index) => {
      const offset = Math.floor(
        (index - currentIndex + threshold) / slides.length,
      );
      newOffsets.push(offset);

      if (direction === Direction.RIGHT) {
        newPositions.push(
          -offset * (slideWidth * slides.length) + index * slideWidth,
        );
      } else if (direction === Direction.LEFT) {
        newPositions.push(
          -offset * (slideWidth * slides.length) + index * slideWidth,
        );
      }
    });

    console.info(`${direction} offsets:`, newOffsets);
    console.info(`${direction} positions:`, newPositions);

    setOffsets(newOffsets);
    setPositions(newPositions);
  };

  useEffect(() => {
    // Call the 'right' logic once after mount
    computePositions(Direction.RIGHT);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current) return;

    const scrollLeft = scrollerRef.current.scrollLeft;
    const newIndex = Math.round(scrollLeft / slideWidth);

    if (newIndex !== currentIndex) {
      const newDirection =
        newIndex > currentIndex ? Direction.RIGHT : Direction.LEFT;

      setScrollDirection(newDirection); // Update scroll direction
      setPreviousIndex(currentIndex);
      setCurrentIndex(newIndex);

      if (onIndexUpdate) {
        onIndexUpdate(newIndex);
      }
    }
  }, [currentIndex, slideWidth, onIndexUpdate]);

  useEffect(() => {
    let animationFrameId: number | null = null;

    const scrollListener = () => {
      if (animationFrameId !== null) return;

      animationFrameId = requestAnimationFrame(() => {
        handleScroll();
        animationFrameId = null;
      });
    };

    const scroller = scrollerRef.current;
    scroller?.addEventListener("scroll", scrollListener);

    return () => {
      scroller?.removeEventListener("scroll", scrollListener);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [handleScroll]);

  useEffect(() => {
    // Compute directions when the index or the scroll direction changes.
    if (scrollDirection) {
      computePositions(scrollDirection);
    }
  }, [scrollDirection, currentIndex]);

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
