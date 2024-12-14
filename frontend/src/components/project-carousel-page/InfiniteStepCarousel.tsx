import React, { useRef, useEffect, useCallback, useState } from "react";

import styles from "./InfiniteStepCarousel.module.scss";

interface InfiniteStepCarouselProps {
  slides: React.ReactNode[];
  onScrollUpdate?: (currentIndex: number) => void;
}

const InfiniteStepCarousel: React.FC<InfiniteStepCarouselProps> = ({
  slides,
  onScrollUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollTimeoutRef = useRef<number | null>(null);

  // Function to handle when a slide becomes fully visible
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const fullyVisibleSlide = entries.find(
        (entry) => entry.isIntersecting && entry.intersectionRatio === 1,
      );

      if (fullyVisibleSlide) {
        const index = parseInt(
          fullyVisibleSlide.target.getAttribute("data-index")!,
          10,
        );
        setCurrentIndex(index);
        if (onScrollUpdate) {
          onScrollUpdate(currentIndex);
        }
      }
    },
    [onScrollUpdate],
  );

  // Debounced scroll detection to ensure user stops scrolling
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      if (containerRef.current) {
        // Ensure scroll position aligns with a slide
        const { scrollLeft, offsetWidth } = containerRef.current;
        const closestIndex = Math.round(scrollLeft / offsetWidth);
        containerRef.current.scrollTo({
          left: closestIndex * offsetWidth,
          behavior: "smooth",
        });
      }
    }, 150); // Adjust debounce timeout as needed
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set up IntersectionObserver for slides
    const observer = new IntersectionObserver(handleIntersection, {
      root: container,
      threshold: 1.0, // Trigger when slide is fully visible
    });

    const slides = container.querySelectorAll(".carousel-slide");
    slides.forEach((slide) => observer.observe(slide));

    // Add scroll event listener
    container.addEventListener("scroll", handleScroll);

    return () => {
      slides.forEach((slide) => observer.unobserve(slide));
      container.removeEventListener("scroll", handleScroll);

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleIntersection, handleScroll]);

  return (
    <div
      ref={containerRef}
      className={`${styles["step-carousel"]} bb-infinite-step-carousel`}
      style={{
        display: "flex",
        overflowX: "scroll",
        scrollSnapType: "x mandatory",
      }}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          data-index={index}
          className="carousel-slide"
          style={{
            flex: "0 0 100%",
            scrollSnapAlign: "center",
          }}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default InfiniteStepCarousel;
