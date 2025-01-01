import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

import styles from "./Carousel.module.scss";

gsap.registerPlugin(ScrollToPlugin);

// BASE_OFFSET accounts for that HTML elements don't scroll
// to negative scrollLeft. TODO: This can be handled in a way that instead
// repositions the slides and scroll position when the user
// scroll stops. It works, I've done it elsewhere, but it's not critical for
// current use cases. Until then, it's not *technically* infinite scrolling left.
const BASE_OFFSET = 1000000;

// 'Direction' throughout application is 'User Perspective', meaning the direction
// the user swiped (versus the direction of progression.)
export const Direction = {
  LEFT: "Left",
  RIGHT: "Right",
} as const;

export type DirectionType = (typeof Direction)[keyof typeof Direction];

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
  onStableIndex?: (stableIndex: number | null) => void;
  stabilizationDuration?: number;
  id?: string;
  onDirectionChange?: (direction: DirectionType) => void;
}

export interface CarouselRef {
  scrollToSlide: (targetIndex: number) => void;
}

/**
 * Bi-directional, infinite-scroll carousel with wrap-around behavior, designed for parallax effects.
 * Leverages native HTML inertial touch/trackpad scrolling for smooth interactions.
 *
 * Supports master/slave architecture:
 * - **Master Carousel:** Intercepts and controls interactions, allowing delegation of scroll parameters to slave carousels via parent/child architecture.
 * - **Slave Carousel:** Follows the master's scroll updates, enabling synchronized parallax effects.
 *   For effective parallaxing, the master is typically invisible, while the slaves remain visible to appear more synchronized.
 *
 * Dependencies:
 * - React (required)
 * - GSAP (used here for smooth scrolling during updates, but could be swapped out).
 *
 * Key Challenges Addressed:
 * 1. **Infinite Scrolling:** HTML's `scrollLeft` doesn't support negative values. This is mitigated with a `BASE_OFFSET` set to a large value.
 *    - Future Improvement: Reset offsets during scroll stops once Safari supports the `scrollend` event.
 *
 * 2. **Scroll Snap Behavior:** `scroll-snap-type: x mandatory` interferes with initial positioning and callbacks.
 *    - Resolution: Applied on a delay post-render to avoid recursion issues.
 *
 * 3. **Initial Offset:** Setting `scrollLeft` to the base offset requires the scroller to be shimmed/propped to the required width.
 *
 * Known Quirks:
 * - WebKit occasionally miscalculates positions during rightward scrolling, causing Chrome to "snap back." This is rare and non-critical but under investigation.
 *
 * TODO:
 * - Add non-native inertial scrolling as an optional feature.
 * - Clone slides dynamically to prevent blank spaces at edges.
 * - Implement lazy loading for slides and ensure proper wrapping of slider positions.
 *
 * Notes:
 * - Smoothness achieved here the main objective, and uncommon if you compare it to most every other carousel.
 *
 * @author Bradley Baysinger
 * @since 2024-12-16
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
      stabilizationDuration = 700,
      onDirectionChange,
      // id, // For debugging
    },
    ref,
  ) => {
    const [scrollIndex, setScrollIndex] = useState(initialIndex);
    const [dataIndex, setDataIndex] = useState(initialIndex);
    const [_previousIndex, setPreviousIndex] = useState<number | null>(null);
    const [stableIndex, setStableIndex] = useState<number | null>(initialIndex);
    const [slideWidth, setSlideWidth] = useState<number>(0);
    const [wrapperWidth, setWrapperWidth] = useState<number>(0);
    const [snap, setSnap] = useState("none");
    const [currentPositions, setCurrentPositions] = useState<number[]>([]);
    const [currentMultipliers, setCurrentMultipliers] = useState<number[]>([]);
    const [currentOffsets, setCurrentOffsets] = useState<number[]>([]);
    const [scrollDirection, setScrollDirection] =
      useState<DirectionType | null>(Direction.LEFT);

    const memoizedSlides = useMemo(() => slides, [slides]);
    const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(false);

    const memoizedPositionsAndMultipliers = useMemo(() => {
      const newPositions: number[] = [];
      const newMultipliers: number[] = [];
      const newOffsets: number[] = [];

      memoizedSlides.forEach((_, index) => {
        let multiplier: number | null = null;
        if (scrollDirection === Direction.LEFT) {
          const threshold = 2;
          multiplier = -Math.floor(
            (index - scrollIndex + threshold) / memoizedSlides.length,
          );
        } else if (scrollDirection === Direction.RIGHT) {
          const threshold = 2;
          multiplier = Math.floor(
            (scrollIndex - index + threshold) / memoizedSlides.length,
          );
        } else {
          throw new Error("No scroll direction set.");
        }

        newMultipliers.push(multiplier);

        const containerOffset = (wrapperWidth - slideWidth) / 2;

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
      if (!isMounted.current) return;

      const totalSlides = memoizedSlides.length;
      const offset = scrollLeft - patchedOffset();
      const newScrollIndex = Math.round(offset / slideSpacing);

      const newDataIndex =
        ((newScrollIndex % totalSlides) + totalSlides) % totalSlides;

      setDataIndex(newDataIndex);

      if (newScrollIndex !== scrollIndex) {
        const newDirection =
          newScrollIndex > scrollIndex ? Direction.LEFT : Direction.RIGHT;

        if (newDirection !== scrollDirection) {
          setScrollDirection(newDirection);
          if (onDirectionChange) {
            onDirectionChange(newDirection);
          }
        }

        setPreviousIndex(scrollIndex);
        setScrollIndex(newScrollIndex);

        if (onIndexUpdate) {
          onIndexUpdate(newDataIndex);
        }

        if (stabilizationTimer.current) {
          clearTimeout(stabilizationTimer.current);
        }

        setStableIndex(null);

        if (onStableIndex) {
          onStableIndex(null);
        }

        if (updateStableIndex && onStableIndex) {
          stabilizationTimer.current = setTimeout(() => {
            setStableIndex(newDataIndex);
            onStableIndex(newDataIndex);
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
      const targetScrollLeft = Math.round(
        newScrollIndex * slideSpacing + patchedOffset(),
      );

      setDataIndex(normalizedIndex);
      setScrollIndex(newScrollIndex);

      if (!isSlave()) {
        scrollerRef.current.scrollLeft = targetScrollLeft;
      }
      const { positions, multipliers } = memoizedPositionsAndMultipliers;
      if (!compare(positions, currentPositions)) {
        setCurrentPositions(positions);
        setCurrentMultipliers(multipliers);
      }

      const timer = setTimeout(() => {
        isMounted.current = true;
        setSnap("x mandatory");
      }, 0);

      return () => clearTimeout(timer);
    }, []);

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

        const containerOffset = (wrapperWidth - slideWidth) / 2;
        const targetPosition =
          newPositions[targetIndex] + patchedOffset() - containerOffset;

        gsap.to(scrollerRef.current, {
          scrollTo: { x: targetPosition },
          duration: 1.0,
          ease: "power2.inOut",
        });
      },
    }));

    const isDebug = () => debug != null && debug !== 0 && debug !== "";

    return (
      <div
        ref={wrapperRef}
        className={
          `${styles["carousel-wrapper"]} ${isSlave() ? styles["slave-wrapper"] : ""} ` +
          wrapperClassName
        }
      >
        {/* {
        !isSlave() && (scrollDirection)
        } */}
        {isDebug() && (
          <div className={styles["debug"]}>
            {scrollIndex} {stableIndex} {scrollerRef.current?.scrollLeft}
          </div>
        )}
        <div
          ref={scrollerRef}
          className={`${styles["carousel-slider"]} ${sliderClassName}`}
          style={{
            transform: slaveTransform(),
            scrollSnapType: snap,
          }}
        >
          <div
            className={styles["carousel-shim"]}
            style={{
              left: BASE_OFFSET * 2,
            }}
          ></div>
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
                ...(isDebug() && { visibility: "visible" }),
              }}
            >
              {isDebug() && (
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
