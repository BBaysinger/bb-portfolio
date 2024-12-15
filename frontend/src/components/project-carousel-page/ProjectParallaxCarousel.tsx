import React, { useRef, useEffect, useCallback, useMemo } from "react";

import useEmblaCarousel from "embla-carousel-react";
// import "./EmblaCarousel.css"; // Custom styles for Embla

import styles from "./ProjectParallaxCarousel.module.scss";

interface ProjectParallaxCarouselProps {
  layer1Slides: React.ReactNode[];
  layer2Slides: React.ReactNode[];
  onScrollUpdate?: (scrollOffset: number) => void;
}

const ProjectParallaxCarousel: React.FC<ProjectParallaxCarouselProps> = ({
  layer1Slides,
  layer2Slides,
  onScrollUpdate,
}): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [emblaRef] = useEmblaCarousel({ loop: true });

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

  function getRandomColorWithOpacity(opacity = 0.1) {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  function generateColorArray(length: number, opacity = 0.1) {
    return Array.from({ length }, () => getRandomColorWithOpacity(opacity));
  }

  const _colorArray = generateColorArray(layer1Slides.length, 0.1);
  void _colorArray;

  const [emblaPrimaryRef, emblaPrimaryApi] = useEmblaCarousel({
    loop: true,
    // speed: 5, // Adjust speed for smoother scrolling
    dragFree: true, // Enable free scrolling for native-like swipe
  });
  const [emblaSecondaryRef, emblaSecondaryApi] = useEmblaCarousel({
    loop: true,
    // speed: 5,
    dragFree: true,
  });

  useEffect(() => {
    if (!emblaPrimaryApi || !emblaSecondaryApi) return;

    // Synchronize the two sliders
    emblaPrimaryApi.on("scroll", () => {
      emblaSecondaryApi.scrollTo(emblaPrimaryApi.selectedScrollSnap(), true);
    });

    emblaSecondaryApi.on("scroll", () => {
      emblaPrimaryApi.scrollTo(emblaSecondaryApi.selectedScrollSnap(), true);
    });
  }, [emblaPrimaryApi, emblaSecondaryApi]);

  return (
    <div className={styles["embla"]} ref={emblaRef}>
      <div className={styles["embla__container"]}>
        {layer1Slides.map((slide, index) => (
          <div className={styles["embla__slide"]} key={`layer1-${index}`}>
            {slide}
          </div>
        ))}
        {/* {layer2Slides.map((slide, index) => (
            <div className="embla__slide" key={`layer2-${index}`}>
              {slide}
            </div>
          ))} */}
      </div>
    </div>
  );
};

export default ProjectParallaxCarousel;
