import React, { useRef, useEffect, useCallback } from "react";

interface ParallaxStepCarouselProps {
  layer1Slides: React.ReactNode[];
  layer2Slides: React.ReactNode[];
  onScrollUpdate?: (scrollOffset: number) => void;
}

const ParallaxStepCarousel: React.FC<ParallaxStepCarouselProps> = ({
  layer1Slides,
  layer2Slides,
  onScrollUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (containerRef.current && onScrollUpdate) {
      const scrollOffset = containerRef.current.scrollLeft;
      onScrollUpdate(scrollOffset);
    }
  }, [onScrollUpdate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return (
    <div
      className="main-carousel"
      ref={containerRef}
      style={{
        display: "flex",
        overflowX: "scroll",
        scrollSnapType: "x mandatory",
      }}
    >
      {layer1Slides.map((slide, index) => (
        <div
          key={index}
          className="carousel-slide"
          style={{
            flex: "0 0 100%",
            scrollSnapAlign: "start",
          }}
        >
          {slide}
        </div>
      ))}
      {layer2Slides.map((slide, index) => (
        <div
          key={index}
          className="carousel-slide"
          style={{
            flex: "0 0 100%",
            scrollSnapAlign: "start",
          }}
        >
          {slide}
        </div>
      ))}
    </div>
  );
};

export default ParallaxStepCarousel;
