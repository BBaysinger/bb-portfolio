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

  const [masterScrollLeft, setMasterScrollLeft] = useState<number>(0);
  const [stabilizedIndex, setStabilizedIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const slideSpacings = {
    layer1: 693,
    master: 720,
    layer2: 900,
  };

  const layerMultipliers = {
    layer1: slideSpacings.layer1 / slideSpacings.master,
    layer2: slideSpacings.layer2 / slideSpacings.master,
  };

  // Necessitated by the spacing differences, but the values seem arbitrary.
  // Set the spacings all the same, and the slides align as expected...
  // TODO: Figure out how to calculate (and incorporate into carousel?)
  const layerShims = {
    layer1: -5,
    layer2: 38,
  };

  const updateScale = () => {
    const minWidth = 320;
    const maxWidth = 680;
    const minScale = 0.4755;
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
    setStabilizedIndex(index);
  };

  const onIndexUpdate = (index: number) => {
    setStabilizedIndex(null);
    setCurrentIndex(index);
  };

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const getSlideClass = (index: number) =>
    (index === stabilizedIndex
      ? `${styles["stabilized-slide"]} bb-stabilized-slide`
      : "") + ` bb-transparent-slide`;

  return (
    <div
      className={
        `${styles["parallax-carousel"]} bb-parallax-carousel ` +
        (currentIndex === stabilizedIndex ? "bb-stabilized-carousel" : "")
      }
      style={{ transform: `scale(${scale})` }}
      ref={containerRef}
    >
      {/* laptops (slave) */}
      <Carousel
        slides={layer1Slides.map((slide, index) => (
          <div key={index} className={getSlideClass(index)}>
            {slide}
          </div>
        ))}
        slideSpacing={slideSpacings.layer1}
        externalScrollLeft={
          masterScrollLeft * layerMultipliers.layer1 + layerShims.layer1
        }
        onIndexUpdate={onIndexUpdate}
        debug={"1"}
        wrapperClassName="bb-carousel bb-carousel-laptops"
      />

      {/* control (master) */}
      <Carousel
        slides={layer1Slides.map((_, index) => (
          <div key={index} className={`${styles["transparent-slide"]}`}>
            {index + 1}
          </div>
        ))}
        slideSpacing={slideSpacings.master}
        onScrollUpdate={setMasterScrollLeft}
        onStableIndex={onStableIndex}
        onIndexUpdate={onIndexUpdate}
        debug={""}
        wrapperClassName="bb-carousel bb-carousel-master"
        slideClassName="bb-slide-wrapper"
      />

      {/* phones (slave) */}
      <Carousel
        slides={layer2Slides.map((slide, index) => (
          <div key={index} className={getSlideClass(index)}>
            {slide}
          </div>
        ))}
        slideSpacing={slideSpacings.layer2}
        externalScrollLeft={
          masterScrollLeft * layerMultipliers.layer2 + layerShims.layer2
        }
        onIndexUpdate={onIndexUpdate}
        debug={""}
        wrapperClassName="bb-carousel bb-carousel-phones"
      />
    </div>
  );
};

export default ProjectParallaxCarousel;
