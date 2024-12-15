import React, { useRef, useState, useEffect, useCallback } from "react";
import styles from "./Carousel.module.scss";

const BASE_OFFSET = 10000;

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
  const totalSlides = slides.length;
  let offsets: number[] = [];
  let positions: number[] = [];

  useEffect(() => {
    if (scrollerRef.current) {
      console.log("doing it");
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
    if (onIndexUpdate) {
      console.log(currentIndex, previousIndex);
      if (currentIndex > previousIndex) {
        const threshold = 1;
        positions = [];
        offsets = [];
        let offset: number = NaN;
        slides.map((_, index) => {
          offset = Math.floor((index - currentIndex + threshold) / totalSlides);
          offsets.push(offset);
          positions.push(
            -offset * (slideWidth * slides.length) + index * slideWidth,
          );
        });
        // console.info('offsets:', offsets);
        // console.info(positions);
        // onIndexUpdate(currentIndex);
      } else if (currentIndex < previousIndex) {
        const threshold = 1;
        positions = [];
        offsets = [];
        let offset: number = NaN;
        slides.map((_, index) => {
          offset = Math.floor((index - currentIndex + threshold) / totalSlides);
          offsets.push(offset);
          // positions.push(
          //   -offset * (slideWidth * slides.length) + index * slideWidth,
          // );
        });
        console.info(offsets);
      } else {
        // 🫣
      }
    }
  }, [currentIndex, onIndexUpdate]);

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current || slideWidth === 0) return;

    const scrollLeft = scrollerRef.current.scrollLeft;
    const scrollOffset = scrollLeft - BASE_OFFSET;

    const newIndex = Math.round(scrollOffset / slideWidth);

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
            left: index * slideWidth + BASE_OFFSET + "px",
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
