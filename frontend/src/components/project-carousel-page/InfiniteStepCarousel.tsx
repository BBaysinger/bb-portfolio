import React, { useRef, useState, useEffect, useCallback } from "react";
import styles from "./InfiniteStepCarousel.module.scss";

interface InfiniteStepCarouselProps {
  slides: React.ReactNode[];
  initialIndex?: number;
  onIndexUpdate?: (currentIndex: number) => void;
}

const InfiniteStepCarousel: React.FC<InfiniteStepCarouselProps> = ({
  slides,
  initialIndex = 0,
  onIndexUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [slideWidth, setSlideWidth] = useState(0);
  const [positions, setPositions] = useState<number[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);

  const totalSlides = slides.length;

  // Helper to calculate offsets and positions
  const calculateOffsetsAndPositions = (currentIndex: number) => {
    const newOffsets: number[] = [];
    const newPositions: number[] = [];

    for (let i = 0; i < totalSlides; i++) {
      const offset = Math.floor((i - currentIndex + 1) / totalSlides);
      newOffsets.push(offset);
      newPositions.push(-offset * (slideWidth * totalSlides) + i * slideWidth);
    }

    // console.log(newOffsets);
    // console.log(newPositions);

    return { newOffsets, newPositions };
  };

  // Update slideWidth on mount and resize
  useEffect(() => {
    const updateSlideWidth = () => {
      if (containerRef.current) {
        setSlideWidth(containerRef.current.offsetWidth);
      }
    };

    updateSlideWidth();
    window.addEventListener("resize", updateSlideWidth);

    return () => {
      window.removeEventListener("resize", updateSlideWidth);
    };
  }, []);

  // Initialize scroll position on mount
  useEffect(() => {
    if (containerRef.current && slideWidth > 0) {
      containerRef.current.scrollLeft = (initialIndex + 1) * slideWidth;
    }
  }, [initialIndex, slideWidth]);

  // Update offsets and positions when currentIndex changes
  useEffect(() => {
    if (slideWidth > 0) {
      const { newOffsets, newPositions } =
        calculateOffsetsAndPositions(currentIndex);

      setOffsets(newOffsets);
      setPositions(newPositions);

      if (onIndexUpdate) {
        onIndexUpdate(currentIndex);
      }
    }
  }, [currentIndex, slideWidth, onIndexUpdate]);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (!containerRef.current || slideWidth === 0) return;

    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;

    const newIndex = Math.round(scrollLeft / slideWidth) - 1;

    if (newIndex !== currentIndex) {
      setPreviousIndex(currentIndex);
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, slideWidth]);

  return (
    <div
      ref={containerRef}
      className={`${styles["step-carousel"]} bb-infinite-step-carousel`}
      onScroll={handleScroll}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles["carousel-slide"]}`}
          style={{
            left: positions[index] ?? (index + 1) * slideWidth + "px",
            width: slideWidth + "px",
          }}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default InfiniteStepCarousel;
