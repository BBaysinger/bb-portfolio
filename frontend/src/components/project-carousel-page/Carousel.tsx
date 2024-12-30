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
  onIndexUpdate?: (scrollIndex: number) => void;
  debug?: string | number | null;
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
 * Bi-directional, infinite-scolling (wraparound) carousel using native HTML
 * element inertial scroll behavior.
 * Can be a master or slave carousel. Master carousel intercepts and controls the
 * interactions, and can then but used by a parent that delegates the scroll
 * parameters to slave carousels that are also instances of this FC, although
 * thier mechanics are slightly different for performance and other reasons.
 * This allows for parallax effects and other complex interactions.
 * React is the only dependency.
 *
 * The two main gotchas... (TODO)
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
      debug = 0,
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
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scrollIndex, setScrollIndex] = useState(initialIndex);
    const [dataIndex, setDataIndex] = useState(initialIndex);
    const [_previousIndex, setPreviousIndex] = useState(NaN);
    const [slideWidth, setSlideWidth] = useState<number>(0);
    const [wrapperWidth, setWrapperWidth] = useState<number>(0);

    const [enableSnap, setEnableSnap] = useState(false);
    const [scrollDirection, setScrollDirection] =
      useState<DirectionType | null>(Direction.RIGHT);
    const [currentPositions, setCurrentPositions] = useState<number[]>([]);
    const [currentMultipliers, setCurrentMultipliers] = useState<number[]>([]);
    const [currentOffsets, setCurrentOffsets] = useState<number[]>([]);
    const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
    const memoizedSlides = useMemo(() => slides, [slides]);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

    const memoizedPositionsAndMultipliers = useMemo(() => {
      const newPositions: number[] = [];
      const newMultipliers: number[] = [];
      const newOffsets: number[] = [];

      memoizedSlides.forEach((_, index) => {
        let multiplier: number = NaN;
        if (scrollDirection === Direction.RIGHT) {
          const threshold = 2;
          multiplier = -Math.floor(
            (index - scrollIndex + threshold) / memoizedSlides.length,
          );
        } else if (scrollDirection === Direction.LEFT) {
          const threshold = 4;
          multiplier = Math.floor(
            (scrollIndex - index + threshold) / memoizedSlides.length,
          );
        } else {
          throw new Error("No scroll direction set.");
        }

        newMultipliers.push(multiplier);

        const containerOffset = (wrapperWidth - slideWidth) / 2;

        if (wrapperWidth > 0 && slideWidth > 0) {
          setEnableSnap(true);
        }

        newPositions.push(
          Math.round(
            multiplier * slideSpacing * memoizedSlides.length +
              index * slideSpacing +
              containerOffset,
          ),
        );

        const normalizedOffset =
          (((index - scrollIndex) % memoizedSlides.length) +
            memoizedSlides.length) %
          memoizedSlides.length;

        newOffsets.push(
          normalizedOffset <= memoizedSlides.length / 2
            ? normalizedOffset
            : normalizedOffset - memoizedSlides.length,
        );
      });

      return {
        positions: newPositions,
        multipliers: newMultipliers,
        offsets: newOffsets,
      };
    }, [scrollIndex, scrollDirection, slideWidth, wrapperWidth]);

    const updateIndexPerPosition = (
      scrollLeft: number,
      updateStableIndex: boolean = true,
    ) => {
      const totalSlides = memoizedSlides.length;

      const newScrollIndex = Math.round(
        (scrollLeft - patchedOffset()) / slideSpacing,
      );

      setDataIndex(
        ((newScrollIndex % totalSlides) + totalSlides) % totalSlides,
      );

      // console.log("Indexes updated:", { newScrollIndex, dataIndex });

      if (newScrollIndex !== scrollIndex) {
        const newDirection =
          newScrollIndex > scrollIndex ? Direction.RIGHT : Direction.LEFT;

        if (newDirection !== scrollDirection) {
          setScrollDirection(newDirection);
        }

        setPreviousIndex(scrollIndex);
        setScrollIndex(newScrollIndex);

        if (onIndexUpdate) {
          onIndexUpdate(dataIndex);
        }

        if (stabilizationTimer.current) {
          clearTimeout(stabilizationTimer.current);
        }

        if (updateStableIndex && onStableIndex) {
          stabilizationTimer.current = setTimeout(() => {
            onStableIndex(dataIndex);
          }, stabilizationDuration);
        }
      }

      if (onScrollUpdate) {
        onScrollUpdate(scrollLeft - patchedOffset());
      }
    };

    const updateIndexRef = useRef(updateIndexPerPosition);

    useEffect(() => {
      updateIndexRef.current = updateIndexPerPosition;
    }, [updateIndexPerPosition]);

    const handleScroll = useCallback(() => {
      if (!scrollerRef.current) return;

      const scrollLeft = scrollerRef.current.scrollLeft;

      updateIndexRef.current(scrollLeft);
    }, []);

    useEffect(() => {
      if (typeof externalScrollLeft === "number") {
        updateIndexPerPosition(externalScrollLeft, false);
      }
    }, [externalScrollLeft]);

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

      if (!isSlave()) {
        const scroller = scrollerRef.current;
        scroller?.addEventListener("scroll", scrollListener);

        return () => {
          scroller?.removeEventListener("scroll", scrollListener);
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
      }
    }, [handleScroll, frameDuration]);

    const compare = (a: any[], b: any[]) => {
      return JSON.stringify(a) === JSON.stringify(b);
    };

    const isSlave = () => typeof externalScrollLeft === "number";
    const patchedOffset = () => (isSlave() ? 0 : BASE_OFFSET);

    useEffect(() => {
      const { positions, multipliers, offsets } =
        memoizedPositionsAndMultipliers;

      if (!compare(positions, currentPositions)) {
        setCurrentPositions(positions);
        setCurrentMultipliers(multipliers);
        setCurrentOffsets(offsets);
      }
    }, [memoizedPositionsAndMultipliers]);

    useEffect(() => {
      if (!scrollerRef.current) return;

      const totalSlides = memoizedSlides.length;
      const normalizedIndex =
        ((initialIndex % totalSlides) + totalSlides) % totalSlides;

      const newScrollIndex = scrollIndex + (normalizedIndex - dataIndex);
      const targetScrollLeft = newScrollIndex * slideSpacing + patchedOffset();

      setDataIndex(normalizedIndex);
      setScrollIndex(newScrollIndex);

      if (!isSlave()) {
        console.log("Scrolling to data index:", {
          initialIndex,
          normalizedIndex,
          newScrollIndex,
          targetScrollLeft,
        });
        scrollerRef.current.scrollLeft = targetScrollLeft;
      }
      const { positions, multipliers } = memoizedPositionsAndMultipliers;
      if (!compare(positions, currentPositions)) {
        setCurrentPositions(positions);
        setCurrentMultipliers(multipliers);
      }
    }, []);

    // useEffect(() => {
    //   if (scrollerRef.current && !isSlave()) {
    //     scrollerRef.current.scrollLeft = patchedOffset();
    //   }
    // }, []);

    useEffect(() => {
      const measureWidths = () => {
        const widths = slideRefs.current.map((ref) => ref?.offsetWidth || 0);
        const newSlideWidth = Math.max(...widths);
        const newWrapperWidth = wrapperRef.current?.offsetWidth || 0;

        if (!newSlideWidth || !newWrapperWidth) {
          requestAnimationFrame(measureWidths);
          return;
        }

        setSlideWidth(newSlideWidth);
        setWrapperWidth(newWrapperWidth);
      };

      const timer = setTimeout(measureWidths, 0);

      return () => clearTimeout(timer);
    }, [slides]);

    const slaveTransform = (): string => {
      if (typeof externalScrollLeft === "number") {
        return `translateX(${Math.round(-externalScrollLeft)}px)`;
      } else return "";
    };

    useImperativeHandle(ref, () => ({
      scrollToSlide: (targetIndex: number) => {
        if (!scrollerRef.current) return;

        const offsetToTarget = currentOffsets[targetIndex];
        const direction = offsetToTarget > 0 ? Direction.RIGHT : Direction.LEFT;

        setScrollDirection(direction);

        const { positions: newPositions } = memoizedPositionsAndMultipliers;
        const targetPosition = newPositions[targetIndex] + patchedOffset();

        scrollerRef.current.scrollTo({
          left: targetPosition,
          behavior: "smooth",
        });
      },
      // scrollToDataIndex, // Add this method
    }));

    return (
      <div
        ref={wrapperRef}
        className={
          `${styles["carousel-wrapper"]} ${isSlave() ? styles["slave-wrapper"] : ""} ` +
          wrapperClassName
        }
      >
        {/* {debug === 2 && (
          <div className={styles["debug"]}>
            {scrollIndex} {scrollerRef.current?.scrollLeft}
          </div>
        )} */}
        <div
          ref={scrollerRef}
          className={`${styles["carousel-slider"]} ${sliderClassName}`}
          style={{
            transform: slaveTransform(),
            scrollSnapType: enableSnap ? "x mandatory" : "none",
          }}
        >
          <div className={styles["carousel-shim"]}></div>
          {memoizedSlides.map((slide, index) => (
            <div
              key={index}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              className={
                `${styles["carousel-slide"]} ` +
                `${Math.abs(currentOffsets[index]) > 1 ? styles["hidden-slide"] : ""} ` +
                slideClassName
              }
              style={{
                transform: `translateX(${patchedOffset() + currentPositions[index]}px)`,
                visibility: debug ? "visible" : "unset",
              }}
            >
              {debug != null && debug !== 0 && debug !== "" && (
                <div className={styles["debug-info"]}>
                  <div>Index: {index}</div>
                  <div>Multiplier: {currentMultipliers[index]}</div>
                  <div>xPos: {currentPositions[index] + "px"}</div>
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
