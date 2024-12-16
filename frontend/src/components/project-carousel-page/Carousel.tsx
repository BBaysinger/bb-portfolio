import React, { useRef, useState, useEffect, useCallback } from "react";

import styles from "./Carousel.module.scss";

const BASE_OFFSET = 1000000;

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
  debug?: boolean;
}

const Carousel: React.FC<CarouselProps> = ({
  slides,
  slideWidth,
  initialIndex = 0,
  onIndexUpdate,
  debug = false,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [_previousIndex, setPreviousIndex] = useState(NaN);
  const [scrollDirection, setScrollDirection] = useState<DirectionType | null>(
    null,
  );
  const [positions, setPositions] = useState<number[]>([]);
  const [multipliers, setMultipliers] = useState<number[]>([]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = BASE_OFFSET + initialIndex * slideWidth;
    }
  }, [initialIndex, slideWidth]);

  const computePositions = (direction: DirectionType) => {
    // Retain 1 slide opposite of scroll direction to avoid blanking while still in view.

    const newPositions: number[] = [];
    const newMultipliers: number[] = [];

    slides.forEach((_, index) => {
      let multiplier: number = NaN;
      // Threshold serves a slightly different purpose for each direction.
      // Scrolling right, it's only required to prevent slides from blanking
      // before they are completely out of view. Scrolling left, it's required
      // to widen the scrollable distance before reversing directions, so the
      // element doesn't halt scrolling mid scroll.
      if (direction === Direction.RIGHT) {
        const threshold = 2;
        multiplier = -Math.floor(
          (index - currentIndex + threshold) / slides.length,
        );
      } else if (direction === Direction.LEFT) {
        const threshold = 4;
        multiplier = Math.floor(
          (currentIndex - index + threshold) / slides.length,
        );
      }

      newMultipliers.push(multiplier);
      newPositions.push(
        multiplier * slideWidth * slides.length + index * slideWidth,
      );
    });

    if (debug) {
      console.info(`${direction} multipliers:`, newMultipliers);
      console.info(`${direction} positions:`, newPositions);
    }

    setMultipliers(newMultipliers);
    setPositions(newPositions);
  };

  useEffect(() => {
    // Call the 'right' logic once after mount to compute the initial positions.
    computePositions(Direction.RIGHT);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current) return;

    const scrollLeft = scrollerRef.current.scrollLeft;
    const newIndex = -Math.round((BASE_OFFSET - scrollLeft) / slideWidth);

    if (newIndex !== currentIndex) {
      const newDirection =
        newIndex > currentIndex ? Direction.RIGHT : Direction.LEFT;

      if (newDirection !== scrollDirection) {
        setScrollDirection(newDirection);
      }
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
    if (scrollDirection) {
      computePositions(scrollDirection);
    }
  }, [scrollDirection, currentIndex]);

  return (
    <div ref={scrollerRef} className={`${styles["carousel"]} bb-carousel`}>
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles["carousel-slide"]}`}
          style={{
            left: BASE_OFFSET + positions[index] + "px",
          }}
        >
          {debug && (
            <div className={styles["debug-info"]}>
              <div>Index: {index}</div>
              <div>Multiplier: {multipliers[index]}</div>
              <div>xPos: {positions[index] + "px"}</div>
            </div>
          )}
          {slide}
        </div>
      ))}
    </div>
  );
};

export default Carousel;
