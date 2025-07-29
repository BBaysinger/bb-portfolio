import clsx from "clsx";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/all";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { useDragInertia } from "@/hooks/useDragInertia";
import { resolveClass } from "@/utils/resolveClass";

import styles from "./Carousel.module.scss";
import {
  CarouselProps,
  Direction,
  Source,
  type SourceType,
  type DirectionType,
  type CarouselRef,
} from "./CarouselTypes";

/**
 * Carousel Component
 * - Bi-directional, infinite-scroll carousel with wrap-around behavior.
 * - Leverages browser-native HTML inertial touch/swipe trackpad/gesture scrolling for smooth interactions.
 * - Infinite scroll supporting master-slave architecture for synchronizing parallax effects.
 * - Built for performance and smooth user interaction with inertial scrolling and precise position tracking.
 * - Designed to handle various use cases, including custom scroll synchronization and routing.
 * - Slides are passed as props.
 * - Minimal state, for performance and smoothest user interaction possible.
 *
 * Supports master/slave architecture:
 * - **Master Carousel:** Intercepts and controls interactions, allowing delegation of scroll parameters to slave carousels via parent/child architecture.
 * - **Slave Carousel:** Follows the master's scroll updates, enabling synchronized parallax effects.
 *   For effective parallaxing, the master is typically invisible, while the slaves remain visible to appear more synchronized.
 *
 * Dependencies:
 * - React (required)
 * - GSAP (used here for smooth scrolling, but will be swapped out for a custom physics solution).
 *
 * Key Challenges Addressed:
 * 1. **Infinite Scrolling:** HTML's `scrollLeft` doesn't support negative values. This is mitigated with a `BASE_OFFSET` set to a large value.
 *    - Future Improvement: Reset offsets during scroll stops once Safari supports the `scrollend` event (which will make the solution more elegant).
 *
 * 2. **Scroll Snap Behavior:** `scroll-snap-type: x mandatory` can interfere with initial positioning and callbacks.
 *    - Resolution: Applied on a delay post-render to avoid recursion issues, which also allows for visual inspection of alignment before being applied.
 *
 * 3. **Initial Offset:** Initially setting `scrollLeft` to the base offset requires the scroller to be shimmed/propped to the required width
 *    if there are no slides to the right of the initial index.
 *
 * TODO:
 * - Add non-native inertial scrolling as:
 *   1. An optional feature to unify the experience between different browser types.
 *   2. Enable inertial scroll for mouse-based drag and flick.
 * - Clone slides dynamically to prevent blank spaces at edges.
 * - Implement lazy loading for slides and ensure proper wrapping of scroller positions.
 *
 * Main Features:
 * 1. Infinite scrolling with wrap-around behavior.
 * 2. Parallax-friendly master/slave architecture for multi-layer effects.
 * 3. Smooth scrolling using GSAP.
 *
 * Notes:
 * - Smoothness achieved here the main objective, and uncommon if you compare it to most every other carousel.
 *
 * @author Bradley Baysinger
 * @since 2024-12-16
 * @version N/A
 */
gsap.registerPlugin(ScrollToPlugin);

// BASE_OFFSET accounts for that HTML elements don't scroll
// to negative scrollLeft. TODO: This can be handled in a way that instead
// repositions the slides and scroll position when the user
// scroll stops. It works, I've done it elsewhere, but it's not critical for
// current use cases. Until then, it's not *technically* infinite scrolling left,
// but unlikely that anyone will ever scroll that far left.
const BASE_OFFSET = 1000000;

const Carousel = forwardRef<CarouselRef, CarouselProps>((props, ref) => {
  const {
    slides,
    slideSpacing,
    initialIndex = 0,
    onIndexUpdate,
    debug = 0,
    onScrollUpdate,
    onStabilizationUpdate,
    stabilizationDelay = 800,
    isSlaveMode = false,
    classNamePrefix = "",
    styleMap,
    layerId = "",
  } = props;

  const [scrollIndex, setScrollIndex] = useState(initialIndex);
  const [wrapperWidth, setWrapperWidth] = useState<number>(0);
  const [snap, setSnap] = useState<"none" | "x mandatory">("none");
  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const externalScrollLeftRef = useRef<number | null>(null);
  const slideWidthRef = useRef<number>(0);
  const scrollTriggerSource = useRef<SourceType>(Source.NATURAL);
  const scrollLeftTo = useRef<((value: number) => void) | null>(null);
  const scrollDirectionRef = useRef<DirectionType>(Direction.LEFT);
  const stableIndex = useRef<number | null>(initialIndex);
  const scrollIndexRef = useRef<number>(initialIndex);

  const getWrapperClass = (): string => {
    const retVal = clsx(
      resolveClass("carouselWrapper", classNamePrefix, styles, styleMap),
      resolveClass(
        isSlaveMode ? "carouselSlaveWrapper" : "carouselMasterWrapper",
        classNamePrefix,
        styles,
        styleMap,
      ),
      resolveClass(
        `carousel${layerId}Wrapper`,
        classNamePrefix,
        styles,
        styleMap,
      ),
    );
    return retVal;
  };

  const getScrollerClass = (): string => {
    return resolveClass("carouselScroller", classNamePrefix, styles, styleMap);
  };

  const getSlideClass = (): string => {
    return resolveClass("carouselSlide", classNamePrefix, styles, styleMap);
  };

  const memoizedSlides = useMemo(() => slides, [slides]);

  const draggable = useDragInertia(
    scrollerRef,
    setSnap,
    slideSpacing,
    isSlaveMode,
    wrapperWidth,
    slideWidthRef,
  );

  const patchedOffset = useCallback(() => {
    return isSlaveMode ? 0 : BASE_OFFSET;
  }, [isSlaveMode]);

  useEffect(() => {
    scrollIndexRef.current = scrollIndex;
  }, [scrollIndex]);

  const deriveDataIndex = useCallback(
    (overrideScrollIndex?: number): number => {
      const slidesLength = slides.length;
      const index =
        typeof overrideScrollIndex === "number"
          ? overrideScrollIndex
          : scrollIndexRef.current;
      return ((index % slidesLength) + slidesLength) % slidesLength;
    },
    [slides.length],
  );

  const dataIndex = useMemo(() => deriveDataIndex(), [deriveDataIndex]);

  const memoizedPositionsAndMultipliers = useMemo(() => {
    const newPositions: number[] = [];
    const newMultipliers: number[] = [];
    const newOffsets: number[] = [];

    memoizedSlides.forEach((_, index) => {
      let multiplier: number | null = null;
      const threshold = 2;
      if (scrollDirectionRef.current === Direction.LEFT) {
        multiplier = -Math.floor(
          (index - scrollIndex + threshold) / memoizedSlides.length,
        );
      } else if (scrollDirectionRef.current === Direction.RIGHT) {
        multiplier = Math.floor(
          (scrollIndex - index + threshold) / memoizedSlides.length,
        );
      } else {
        throw new Error("No scroll direction set.");
      }
      newMultipliers.push(multiplier);
      const containerOffset = (wrapperWidth - slideWidthRef.current) / 2;
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
  }, [scrollIndex, wrapperWidth, slideSpacing, memoizedSlides]);

  const updateIndexPerPosition = useCallback(
    (scrollLeft: number, updateStableIndex: boolean = true) => {
      const totalSlides = memoizedSlides.length;
      const offset = scrollLeft - patchedOffset();
      const newScrollIndex = Math.round(offset / slideSpacing);
      const newDataIndex =
        ((newScrollIndex % totalSlides) + totalSlides) % totalSlides;

      if (scrollIndex !== newScrollIndex) {
        const newDirection =
          newScrollIndex > scrollIndex ? Direction.LEFT : Direction.RIGHT;
        if (newDirection !== scrollDirectionRef.current) {
          scrollDirectionRef.current = newDirection;
        }
        setScrollIndex(newScrollIndex);
        onIndexUpdate?.(newDataIndex);
        if (stabilizationTimer.current)
          clearTimeout(stabilizationTimer.current);
        if (
          updateStableIndex &&
          scrollTriggerSource.current !== Source.IMPERATIVE
        ) {
          stabilizationTimer.current = setTimeout(() => {
            stableIndex.current = newDataIndex;
            onStabilizationUpdate?.(
              newDataIndex,
              scrollTriggerSource.current,
              newDirection,
            );
          }, stabilizationDelay);
        }
      }
      onScrollUpdate?.(scrollLeft - patchedOffset());
    },
    [
      memoizedSlides.length,
      scrollIndex,
      slideSpacing,
      onIndexUpdate,
      onScrollUpdate,
      onStabilizationUpdate,
      stabilizationDelay,
      patchedOffset,
    ],
  );

  const updateIndexRef = useRef(updateIndexPerPosition);
  useEffect(() => {
    updateIndexRef.current = updateIndexPerPosition;
  }, [updateIndexPerPosition]);

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current) return;
    updateIndexRef.current(scrollerRef.current.scrollLeft);
  }, []);

  const targetFPS = 40;
  const frameDuration = 1000 / targetFPS;

  useEffect(() => {
    let animationFrameId: number | null = null;
    let lastFrameTime = 0;

    const scrollListener = (_: Event) => {
      if (
        !draggable?.current?.isThrowing &&
        !draggable?.current?.isDragging &&
        scrollTriggerSource.current !== Source.IMPERATIVE &&
        snap !== "x mandatory"
      ) {
        setSnap("x mandatory");
      }
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

    if (!isSlaveMode) {
      const scroller = scrollerRef.current;
      scroller?.addEventListener("scroll", scrollListener);
      return () => {
        scroller?.removeEventListener("scroll", scrollListener);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      };
    }
  }, [handleScroll, frameDuration, draggable, isSlaveMode, snap]);

  const {
    positions: currentPositions,
    multipliers: currentMultipliers,
    offsets: currentOffsets,
  } = useMemo(
    () => memoizedPositionsAndMultipliers,
    [memoizedPositionsAndMultipliers],
  );

  useEffect(() => {
    if (!scrollerRef.current) return;
    const totalSlides = memoizedSlides.length;
    const normalizedIndex =
      ((initialIndex % totalSlides) + totalSlides) % totalSlides;
    const newScrollIndex =
      scrollIndexRef.current + (normalizedIndex - dataIndex);
    const targetScrollLeft = Math.round(
      newScrollIndex * slideSpacing + patchedOffset(),
    );
    setScrollIndex(newScrollIndex);
    if (!isSlaveMode) scrollerRef.current.scrollLeft = targetScrollLeft;
    const timer = setTimeout(() => {
      setSnap("x mandatory");
    }, 150);
    return () => clearTimeout(timer);
  }, [
    dataIndex,
    initialIndex,
    isSlaveMode,
    memoizedSlides.length,
    slideSpacing,
    patchedOffset,
  ]);

  useEffect(() => {
    const measureWidths = () => {
      const widths = slideRefs.current.map((ref) => ref?.offsetWidth || 0);
      const newSlideWidth = Math.max(...widths);
      const newWrapperWidth = wrapperRef.current?.offsetWidth || 0;
      if (newSlideWidth + newWrapperWidth > 0) {
        slideWidthRef.current = newSlideWidth;
        setWrapperWidth(newWrapperWidth);
      } else {
        requestAnimationFrame(measureWidths);
      }
    };
    measureWidths();
  }, [slides]);

  const onTweenComplete = useCallback(() => {
    setSnap("x mandatory");
    scrollTriggerSource.current = Source.NATURAL;
    const freshDataIndex = deriveDataIndex(scrollIndexRef.current);
    stableIndex.current = freshDataIndex;
    onStabilizationUpdate?.(
      freshDataIndex,
      Source.IMPERATIVE,
      scrollDirectionRef.current,
    );
  }, [onStabilizationUpdate, deriveDataIndex]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollLeftTo.current = gsap.quickTo(scrollerRef.current, "scrollLeft", {
        overwrite: "auto",
        duration: 0.6,
        ease: "power1.out",
        onComplete: onTweenComplete,
      });
    }
  }, [onTweenComplete]);

  useImperativeHandle(ref, () => ({
    scrollToSlide: (targetIndex: number) => {
      if (!scrollerRef.current || !scrollLeftTo.current) return;
      setSnap("none");
      scrollTriggerSource.current = Source.IMPERATIVE;
      const offsetToTarget = currentOffsets[targetIndex];
      const direction = offsetToTarget > 0 ? Direction.RIGHT : Direction.LEFT;
      scrollDirectionRef.current = direction;
      const { positions: newPositions } = memoizedPositionsAndMultipliers;
      const containerOffset = (wrapperWidth - slideWidthRef.current) / 2;
      const targetPosition =
        newPositions[targetIndex] + patchedOffset() - containerOffset;
      const currentScrollLeft = scrollerRef.current.scrollLeft;
      const distanceToScroll = Math.abs(currentScrollLeft - targetPosition);
      const duration = Math.min(2.0, 0.2 + distanceToScroll / 1500);
      scrollLeftTo.current = gsap.quickTo(scrollerRef.current, "scrollLeft", {
        overwrite: "auto",
        duration,
        ease: "power1.out",
        onComplete: onTweenComplete,
      });
      scrollLeftTo.current(targetPosition);
    },
    setExternalScrollPosition: (newLeft: number) => {
      externalScrollLeftRef.current = Math.round(newLeft);
      if (scrollerRef.current) {
        scrollerRef.current.style.transform = `translateX(${-newLeft}px)`;
      }
      updateIndexPerPosition(newLeft, false);
    },
  }));

  const isDebug = () => Boolean(debug);

  return (
    <div ref={wrapperRef} className={getWrapperClass()}>
      {isDebug() && (
        <div className={styles.debug}>
          {scrollIndex} {stableIndex.current} {scrollerRef.current?.scrollLeft}
        </div>
      )}
      <div
        ref={scrollerRef}
        className={clsx(styles.carouselScroller, getScrollerClass())}
        style={{ scrollSnapType: snap }}
      >
        <div
          className={styles.carouselShim}
          style={{ left: BASE_OFFSET * 2 }}
        ></div>
        {memoizedSlides.map((slide, index) => (
          <div
            key={index}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            className={clsx(
              styles.carouselSlide,
              Math.abs(currentOffsets[index]) > 1 && styles.hiddenSlide,
              getSlideClass(),
            )}
            style={{
              transform: `translateX(${patchedOffset() + currentPositions[index]}px)`,
              ...(isDebug() && { visibility: "visible" }),
            }}
          >
            {isDebug() && (
              <div className={styles.debugInfo}>
                <div>Index: {index}</div>
                <div>Multiplier: {currentMultipliers[index]}</div>
                <div>xPos: {currentPositions[index]}px</div>
              </div>
            )}
            {slide}
          </div>
        ))}
      </div>
    </div>
  );
});

Carousel.displayName = "Carousel";

export default Carousel;
