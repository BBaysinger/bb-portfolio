import React, { useRef, useState, useEffect, useCallback } from "react";
import styles from "./Carousel.module.scss";

const START_OFFSET = 10000;

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
  const [previousIndex, setPreviousIndex] = useState(-1);
  const [slideWidth, setSlideWidth] = useState(0);
  const totalSlides = slides.length;
  let offsets: number[] = [];
  let positions: number[] = [];

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = -START_OFFSET;
      setSlideWidth(scrollerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    if (scrollerRef.current && slideWidth > 0) {
      scrollerRef.current.scrollLeft = (initialIndex + 1) * slideWidth;
    }
  }, [initialIndex, slideWidth]);

  useEffect(() => {
    if (onIndexUpdate) {
      if (currentIndex > previousIndex) {
        const threshold = 1;
        positions = [];
        let offset: number = NaN;
        slides.map((_, index) => {
          offset = Math.floor((index - currentIndex + threshold) / totalSlides);
          offsets.push(offset);
          positions.push(
            -offset * (slideWidth * slides.length) + index * slideWidth,
          );
        });
        console.info(offsets);
        console.info(positions);
        onIndexUpdate(currentIndex);
      } else if (currentIndex < previousIndex) {
        console.info("backwards");
      } else {
        // 🫣
      }
    }
  }, [currentIndex, onIndexUpdate]);

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current || slideWidth === 0) return;

    const container = scrollerRef.current;
    const scrollLeft = container.scrollLeft;

    const newIndex = Math.round(scrollLeft / slideWidth) - 1;

    if (newIndex !== currentIndex) {
      setPreviousIndex(currentIndex);
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, slideWidth, totalSlides]);

  return (
    <div
      ref={scrollerRef}
      className={`${styles["step-carousel"]} bb-infinite-step-carousel`}
      onScroll={handleScroll}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`${styles["carousel-slide"]}`}
          style={{
            left: (index + 1) * slideWidth + START_OFFSET + "px",
            // left: positions[index] + "px",
            width: slideWidth + "px",
          }}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default Carousel;
