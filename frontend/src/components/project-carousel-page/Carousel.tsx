import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
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

export interface CarouselRef {
  scrollToSlide: (targetIndex: number) => void;
}

/**
 * Infinite scolling carousel using native HTML element inertial scroll behavior.
 * Can be a master or slave carousel. Master carousel intercepts and controls the
 * interactions, and can then delegate the scroll parameters to slave carousels.
 * This allows for parallax effects and other complex interactions.
 * React is the only dependency.
 *
 * TODO: This should automatically clone slides when there are not enough
 * to prevent blanking at the edges. Needs to control lazy loading in slides.
 * Needs slider position to wrap to a bounding.
 *
 * @author Bradley Baysinger
 * @since 2024-12-16
 * @version N/A
 */
const Carousel = forwardRef<CarouselRef, CarouselProps>(
  (
    {
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
    },
    ref,
  ) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [_previousIndex, setPreviousIndex] = useState(NaN);
    const [scrollDirection, setScrollDirection] =
      useState<DirectionType | null>(null);
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
          const threshold = 6;
          multiplier = Math.floor(
            (currentIndex - index + threshold) / memoizedSlides.length,
          );
        }

        newMultipliers.push(multiplier);

        newPositions.push(
          Math.round(
            multiplier * slideSpacing * memoizedSlides.length +
              index * slideSpacing,
          ),
        );

        const normalizedOffset =
          (((index - currentIndex) % memoizedSlides.length) +
            memoizedSlides.length) %
          memoizedSlides.length;

        newOffsets.push(
          normalizedOffset <= memoizedSlides.length / 2
            ? normalizedOffset
            : normalizedOffset - memoizedSlides.length,
        );
      });

      if (debug) {
        // console.info(${scrollDirection} multipliers:, newMultipliers);
        // console.info(${scrollDirection} positions:, newPositions);
        // console.info(`${scrollDirection} offsets:`, newOffsets);
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
        onScrollUpdate(Math.round(scrollLeft - offset()));
      }
    };

    const handleScroll = useCallback(() => {
      if (!scrollerRef.current) return;
      const scrollLeft = scrollerRef.current.scrollLeft;
      updateIndex(scrollLeft, scrollDirection);
      // currentIndex is not a dependency, but it's used here to update the index
    }, [scrollDirection, currentIndex]);

    useEffect(() => {
      if (typeof externalScrollLeft === "number") {
        updateIndex(externalScrollLeft, scrollDirection, false);
      }
    }, [externalScrollLeft, scrollDirection]);

    const targetFPS = 40;
    const frameDuration = 1000 / targetFPS;
    let lastFrameTime = 0;

    useEffect(() => {
      let animationFrameId: number | null = null;

      const scrollListener = (_: Event) => {
        if (animationFrameId === null) {
          animationFrameId = requestAnimationFrame((currentTime) => {
            const deltaTime = currentTime - lastFrameTime;

            if (deltaTime >= frameDuration) {
              handleScroll();
              lastFrameTime = currentTime;
            }

            animationFrameId = null;
          });
        }
      };

      const scroller = scrollerRef.current;
      scroller?.addEventListener("scroll", scrollListener);

      return () => {
        scroller?.removeEventListener("scroll", scrollListener);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }, [handleScroll, frameDuration]);

    useEffect(() => {
      if (scrollDirection) {
        const { positions, multipliers, offsets } =
          memoizedPositionsAndMultipliers;
        setPositions(positions);
        setMultipliers(multipliers);
        setOffsets(offsets);
      }
    }, [memoizedPositionsAndMultipliers, scrollDirection]);

    useEffect(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollLeft = offset();
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
        return `translateX(${Math.round(-externalScrollLeft)}px)`;
      } else return "";
    };

    const scrollToSlide = (targetIndex: number) => {
      if (!scrollerRef.current) return;

      const offsetToTarget = offsets[targetIndex];
      const direction = offsetToTarget > 0 ? Direction.RIGHT : Direction.LEFT;
      setScrollDirection(direction);

      const { positions: newPositions } = memoizedPositionsAndMultipliers;

      const targetPosition = newPositions[targetIndex] + offset();

      scrollerRef.current.scrollTo({
        left: targetPosition,
        behavior: "smooth",
      });
    };

    useImperativeHandle(ref, () => ({
      scrollToSlide,
    }));

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
              ${Math.abs(offsets[index]) > 1 ? styles["hidden-slide"] : ""}
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
  },
);

export default Carousel;
