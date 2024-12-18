import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import styles from "./Carousel.module.scss";

// BASE_OFFSET accounts for that HTML elements don't scroll
// to negative scrollLeft. TODO: This can be handled in a way that instead
// repositions the slides and scroll position when the user
// scroll stops. It works, I've done it elsewhere, but it's not critical for
// current use cases. Until then, it's not *technically* infinite scrolling left.
const BASE_OFFSET = 1000000;

const Direction = {
  LEFT: "Left",
  RIGHT: "Right",
} as const;

type DirectionType = (typeof Direction)[keyof typeof Direction];

interface CarouselProps {
  slides: React.ReactNode[];
  slideSpacing: number;
  initialIndex?: number;
  onIndexUpdate?: (currentIndex: number) => void;
  debug?: boolean;
  wrapperClassName?: string;
  slideClassName?: string;
  sliderClassName?: string;
  onScrollUpdate?: (scrollLeft: number) => void;
  externalScrollLeft?: number;
  onStableIndex?: (stableIndex: number) => void;
  stabilizationDuration?: number;
}

/**
 * Infinite scolling carousel using native HTML element inertial scroll behavior.
 * React is the only dependency.
 *
 * TODO: This should automatically clone slides when there are not enough
 * to prevent blanking.
 *
 * @author Bradley Baysinger
 * @since 2024-12-16
 * @version N/A
 */
const Carousel: React.FC<CarouselProps> = ({
  slides,
  slideSpacing,
  initialIndex = 0,
  onIndexUpdate,
  debug = false,
  wrapperClassName = "",
  slideClassName = "",
  sliderClassName = "",
  onScrollUpdate,
  externalScrollLeft,
  onStableIndex,
  stabilizationDuration = 400,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [_previousIndex, setPreviousIndex] = useState(NaN);
  const [scrollDirection, setScrollDirection] = useState<DirectionType | null>(
    null,
  );
  const [positions, setPositions] = useState<number[]>([]);
  const [multipliers, setMultipliers] = useState<number[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);
  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const memoizedSlides = useMemo(() => slides, [slides]);

  const memoizedPositionsAndMultipliers = useMemo(() => {
    const newPositions: number[] = [];
    const newMultipliers: number[] = [];
    const newOffsets: number[] = [];

    memoizedSlides.forEach((_, index) => {
      let multiplier: number = NaN;
      if (scrollDirection === Direction.RIGHT) {
        const threshold = 2;
        multiplier = -Math.floor(
          (index - currentIndex + threshold) / memoizedSlides.length,
        );
      } else if (scrollDirection === Direction.LEFT) {
        const threshold = 4;
        multiplier = Math.floor(
          (currentIndex - index + threshold) / memoizedSlides.length,
        );
      }

      newMultipliers.push(multiplier);

      newPositions.push(
        multiplier * slideSpacing * memoizedSlides.length +
          index * slideSpacing,
      );

      const rawOffset = index - currentIndex;
      const wraparoundOffset =
        rawOffset > 0
          ? rawOffset - memoizedSlides.length
          : rawOffset + memoizedSlides.length;

      newOffsets.push(
        Math.abs(rawOffset) <= Math.abs(wraparoundOffset)
          ? rawOffset
          : wraparoundOffset,
      );
    });

    if (debug) {
      // console.info(`${scrollDirection} multipliers:`, newMultipliers);
      // console.info(`${scrollDirection} positions:`, newPositions);
      console.info(`${scrollDirection} offsets:`, newOffsets);
    }

    return {
      positions: newPositions,
      multipliers: newMultipliers,
      offsets: newOffsets,
    };
  }, [memoizedSlides, currentIndex, slideSpacing, scrollDirection, debug]);

  const updateIndex = (
    scrollLeft: number,
    direction: DirectionType | null,
    updateStableIndex: boolean = true,
  ) => {
    const newIndex = -Math.round((offset() - scrollLeft) / slideSpacing);

    if (newIndex !== currentIndex) {
      const newDirection =
        newIndex > currentIndex ? Direction.RIGHT : Direction.LEFT;

      if (newDirection !== direction) {
        setScrollDirection(newDirection);
      }

      setPreviousIndex(currentIndex);
      setCurrentIndex(newIndex);

      if (onIndexUpdate) {
        onIndexUpdate(newIndex);
      }

      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
      }

      if (updateStableIndex && onStableIndex) {
        stabilizationTimer.current = setTimeout(() => {
          const normalizedIndex =
            ((newIndex % memoizedSlides.length) + memoizedSlides.length) %
            memoizedSlides.length;
          onStableIndex(normalizedIndex);
        }, stabilizationDuration);
      }
    }

    if (onScrollUpdate && !isSlave()) {
      onScrollUpdate(scrollLeft - BASE_OFFSET);
    }
  };

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current) return;
    const scrollLeft = scrollerRef.current.scrollLeft;
    updateIndex(scrollLeft, scrollDirection);
  }, [
    scrollDirection,
    slideSpacing,
    onIndexUpdate,
    onScrollUpdate,
    onStableIndex,
    stabilizationDuration,
  ]);

  useEffect(() => {
    if (typeof externalScrollLeft === "number") {
      updateIndex(externalScrollLeft, scrollDirection, false); // `false` disables the stabilization logic
    }
  }, [
    externalScrollLeft,
    scrollDirection,
    slideSpacing,
    onIndexUpdate,
    onStableIndex,
    stabilizationDuration,
  ]);

  useEffect(() => {
    let animationFrameId: number | null = null;

    const scrollListener = () => {
      if (animationFrameId !== null) return;

      animationFrameId = requestAnimationFrame(() => {
        handleScroll();
        animationFrameId = null;
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
      const { positions, multipliers, offsets } = memoizedPositionsAndMultipliers;
      setPositions(positions);
      setMultipliers(multipliers);
      setOffsets(offsets);
    }
  }, [memoizedPositionsAndMultipliers, scrollDirection]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollLeft = BASE_OFFSET;
      setScrollDirection(Direction.RIGHT);
      const { positions, multipliers } = memoizedPositionsAndMultipliers;
      setPositions(positions);
      setMultipliers(multipliers);
    }
  }, []);

  const isSlave = () => typeof externalScrollLeft === "number";
  const offset = () => (isSlave() ? 0 : BASE_OFFSET);

  const slaveTransform = (): string => {
    if (typeof externalScrollLeft === "number") {
      return `translateX(${-externalScrollLeft}px)`;
    } else return "";
  };

  return (
    <div
      className={`
        ${styles["carousel-wrapper"]}
        ${isSlave() ? styles["slave-wrapper"] : ""}
        ${wrapperClassName}
      `}
    >
      <div
        ref={scrollerRef}
        className={`${styles["carousel-slider"]} ${sliderClassName}`}
        style={{ transform: slaveTransform() }}
      >
        {memoizedSlides.map((slide, index) => (
          <div
            key={index}
            className={`
              ${styles["carousel-slide"]}
              ${Math.abs(offsets[index]) > 2 ? styles["hidden-slide"] : ""}
              ${slideClassName}
            `}
            style={{
              transform: `translateX(${offset() + positions[index]}px)`,
            }}
          >
            {debug && (
              <div className={styles["debug-info"]}>
                <div>Index: {index}</div>
                <div>Multiplier: {multipliers[index]}</div>
                <div>xPos: {positions[index] + "px"}</div>
              </div>
            )}
            {slide}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Carousel;
