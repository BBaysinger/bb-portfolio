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

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Function to generate random color with opacity
  // const getRandomColorWithOpacity = (opacity = 0.1) =>
  //   `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(
  //     Math.random() * 256
  //   )}, ${Math.floor(Math.random() * 256)}, ${opacity})`;

  // // Generate random colors only once using useMemo
  // const randomColors = useMemo(
  //   () => layer1Slides.map(() => getRandomColorWithOpacity(0.1)),
  //   [layer1Slides]
  // );

  // Transparent slides use the pre-generated random colors
  const transparentSlides = layer1Slides.map((_, index) => (
    <div
      key={index}
      // style={{ backgroundColor: randomColors[index] }}
      className={styles["transparent-slide"]}
    >
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
        slideSpacing={693} // Width for laptop carousel
        externalScrollLeft={masterScrollLeft * 0.8} // Slight parallax effect
        debug={false}
        wrapperClassName="bb-carousel-laptops"
      />

      {/* Master: Phantom Carousel (Invisible) */}
      <Carousel
        slides={transparentSlides}
        slideSpacing={693} // Phantom slide width
        onScrollUpdate={setMasterScrollLeft} // Update master scroll position
        debug={false}
        wrapperClassName="bb-carousel-master"
      />

      {/* Layer 2: Parallaxed Phone Carousel */}
      <Carousel
        slides={layer2Slides}
        slideSpacing={693} // Width for phone carousel
        externalScrollLeft={masterScrollLeft * 1.2} // More parallax offset
        debug={false}
        wrapperClassName="bb-carousel-phones"
      />
    </div>
  );
};

export default ProjectParallaxCarousel;
