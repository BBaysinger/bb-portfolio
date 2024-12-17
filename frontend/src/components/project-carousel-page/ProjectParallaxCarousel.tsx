import React, { useRef, useEffect, useState } from "react";
import Carousel from "./Carousel";
import styles from "./ProjectParallaxCarousel.module.scss";

interface ProjectParallaxCarouselProps {
  layer1Slides: React.ReactNode[];
  layer2Slides: React.ReactNode[];
}

const ProjectParallaxCarousel: React.FC<ProjectParallaxCarouselProps> = ({
  layer1Slides,
  layer2Slides,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Track master scrollLeft to synchronize visible carousels
  const [masterScrollLeft, setMasterScrollLeft] = useState<number>(0);

  // Slide spacings for each layer (including master)
  const slideSpacings = {
    layer1: 693, // Layer 1 spacing
    master: 720, // Master layer spacing
    layer2: 850, // Layer 2 spacing
  };

  // Dynamically calculate multipliers for each layer
  const layerMultipliers = {
    layer1: slideSpacings.layer1 / slideSpacings.master, // e.g., 650 / 693
    layer2: slideSpacings.layer2 / slideSpacings.master, // e.g., 720 / 693
  };

  // Update scale on resize for fluid scaling
  const updateScale = () => {
    const minWidth = 320;
    const maxWidth = 1024;
    const minScale = 0.45;
    const maxScale = 1;

    const currentWidth = window.innerWidth;
    const newScale = Math.max(
      minScale,
      Math.min(
        maxScale,
        minScale +
          ((currentWidth - minWidth) / (maxWidth - minWidth)) *
            (maxScale - minScale),
      ),
    );

    setScale(newScale);
  };

  const onStableIndex = (index: number) => {
    console.log(index);
  };

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Transparent slides use placeholders
  const transparentSlides = layer1Slides.map((_, index) => (
    <div key={index} className={styles["transparent-slide"]}>
      {index + 1}
    </div>
  ));

  return (
    <div
      className={`${styles["parallax-carousel"]} bb-parallax-carousel`}
      style={{ transform: `scale(${scale})` }}
      ref={containerRef}
    >
      {/* Layer 1: Parallaxed Laptop Carousel */}
      <Carousel
        slides={layer1Slides}
        slideSpacing={slideSpacings.layer1}
        externalScrollLeft={masterScrollLeft * layerMultipliers.layer1}
        debug={false}
        wrapperClassName="bb-carousel-laptops"
      />

      {/* Master: Phantom Carousel (Invisible) */}
      <Carousel
        slides={transparentSlides}
        slideSpacing={slideSpacings.master}
        onScrollUpdate={setMasterScrollLeft}
        debug={false}
        wrapperClassName="bb-carousel-master"
        onStableIndex={onStableIndex}
      />

      {/* Layer 2: Parallaxed Phone Carousel */}
      <Carousel
        slides={layer2Slides}
        slideSpacing={slideSpacings.layer2}
        externalScrollLeft={masterScrollLeft * layerMultipliers.layer2}
        debug={false}
        wrapperClassName="bb-carousel-phones"
      />
    </div>
  );
};

export default ProjectParallaxCarousel;
