import React, { useRef, useState, useEffect, useCallback } from "react";
import styles from "./Carousel.module.scss";

const BASE_OFFSET = 100000;

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
  const [scrollDirection, setScrollDirection] = useState<
    "left" | "right" | null
  >(null);
  const [positions, setPositions] = useState<number[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);
  const totalSlides = slides.length;

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = BASE_OFFSET + initialIndex * slideWidth;
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
    console.info("Right scroll:", offsets);
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
    console.info("Left scroll:", offsets);
    console.info("Left Positions:", newPositions);
  };

  useEffect(() => {
    // Call the right() logic once after mount
    computeRightPositions();
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current) return;

    const scrollLeft = scrollerRef.current.scrollLeft;
    const newIndex = Math.round(scrollLeft / slideWidth);

    if (newIndex !== currentIndex) {
      setPreviousIndex(currentIndex);
      setScrollDirection(newIndex > currentIndex ? "right" : "left");
      setCurrentIndex(newIndex);
      onIndexUpdate && onIndexUpdate(newIndex);
    }
  }, [currentIndex, slideWidth]);

  useEffect(() => {
    let animationFrameId: number | null = null;

    const scrollListener = () => {
      if (animationFrameId !== null) return; // Prevent multiple frames

      animationFrameId = requestAnimationFrame(() => {
        handleScroll();
        animationFrameId = null; // Reset for the next frame
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
      if (scrollDirection === "right") {
        computeRightPositions();
      } else if (scrollDirection === "left") {
        computeLeftPositions();
      }
    }
  }, [scrollDirection]);

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
