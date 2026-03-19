import clsx from "clsx";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/all";
import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { useDragInertia } from "@/hooks/useDragInertia";
import { recordEvent } from "@/services/rum";
import { resolveClass } from "@/utils/resolveClass";

import styles from "./Carousel.module.scss";
import {
  CarouselProps,
  SlideDirection,
  Source,
  type SourceType,
  type DirectionType,
  type CarouselRef,
} from "./CarouselTypes";

/**
 * Infinite, snap-aware carousel with optional master/slave synchronization.
 *
 * This component is the low-level scroll engine for the project carousel UI.
 * It supports native scrolling, wrap-around positioning, programmatic slide
 * navigation, and synchronized slave layers for parallax-like effects.
 *
 * Design notes:
 * - The master carousel owns native scroll interaction and remains the source
 *   of truth for live motion.
 * - Slave carousels do not scroll independently; they project the master's
 *   position using layer-specific spacing multipliers.
 * - Visual synchronization and semantic updates are intentionally split:
 *   slave layers are updated immediately for same-frame visual lock, while
 *   index, stabilization, and analytics continue on a deferred path.
 * - Infinite scrolling is achieved by rendering each slide once and assigning
 *   it to the correct repeated cycle of the track based on scroll position
 *   and direction.
 *
 * Key constraints:
 * - HTML scroll containers do not support negative `scrollLeft`, so the master
 *   uses a large base offset to simulate leftward infinity.
 * - Scroll snap is applied carefully to avoid interfering with initial
 *   positioning and programmatic movement.
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
    onImmediateScrollUpdate,
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
  const [snap, setSnap] = useState<"none" | "x mandatory">("x mandatory");
  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const externalScrollLeftRef = useRef<number | null>(null);
  const slideWidthRef = useRef<number>(0);
  const scrollTriggerSource = useRef<SourceType>(Source.SCROLL);
  const isInitializingRef = useRef<boolean>(true);
  const scrollLeftTo = useRef<((value: number) => void) | null>(null);
  const scrollDirectionRef = useRef<DirectionType>(SlideDirection.LEFT);
  const stableIndex = useRef<number | null>(initialIndex);
  const scrollIndexRef = useRef<number>(initialIndex);
  // Tracks whether current interaction is mouse drag (vs touch/scroll) for RUM analytics
  const isMouseDragRef = useRef<boolean>(false);
  const [scrollDirection, setScrollDirection] = useState<DirectionType>(
    SlideDirection.LEFT,
  );
  const [slideWidth, setSlideWidth] = useState(0);
  const [stableIndexValue, setStableIndexValue] = useState<number | null>(
    initialIndex,
  );
  const [debugScrollLeft, setDebugScrollLeft] = useState(0);

  const onScrollUpdateRef = useRef(onScrollUpdate);
  useEffect(() => {
    onScrollUpdateRef.current = onScrollUpdate;
  }, [onScrollUpdate]);

  // Keep the immediate visual-sync callback out of the main scroll handler's
  // closure so master scroll events can fan out to slaves without waiting for a
  // React re-render.
  const onImmediateScrollUpdateRef = useRef(onImmediateScrollUpdate);
  useEffect(() => {
    onImmediateScrollUpdateRef.current = onImmediateScrollUpdate;
  }, [onImmediateScrollUpdate]);

  const onStabilizationUpdateRef = useRef(onStabilizationUpdate);
  useEffect(() => {
    onStabilizationUpdateRef.current = onStabilizationUpdate;
  }, [onStabilizationUpdate]);

  useEffect(() => {
    setStableIndexValue(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!debug) return;
    if (scrollerRef.current) {
      setDebugScrollLeft(scrollerRef.current.scrollLeft);
    }
  }, [debug]);

  const getWrapperClass = (): string => {
    const retVal = clsx(
      resolveClass("carousel", classNamePrefix, styles, styleMap),
      resolveClass(
        isSlaveMode ? "carouselSlave" : "carouselMaster",
        classNamePrefix,
        styles,
        styleMap,
      ),
      resolveClass(`carousel${layerId}`, classNamePrefix, styles, styleMap),
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

  /**
   * Callback fired when GSAP drag-and-throw animation completes.
   * Sets flag to distinguish mouse drag from native touch/scroll in RUM tracking.
   */
  const handleMouseDragComplete = useCallback(() => {
    isMouseDragRef.current = true;
  }, []);

  const draggable = useDragInertia(
    scrollerRef,
    setSnap,
    slideSpacing,
    isSlaveMode,
    wrapperWidth,
    slideWidthRef,
    handleMouseDragComplete,
  );

  const patchedOffset = useCallback(() => {
    return isSlaveMode ? 0 : BASE_OFFSET;
  }, [isSlaveMode]);

  useEffect(() => {
    scrollIndexRef.current = scrollIndex;
  }, [scrollIndex]);

  const deriveDataIndex = useCallback(
    (index: number): number => {
      const slidesLength = slides.length;
      return ((index % slidesLength) + slidesLength) % slidesLength;
    },
    [slides.length],
  );

  const memoizedPositionsAndWrapCycleOffsets = useMemo(() => {
    const newPositions: number[] = [];
    const newWrapCycleOffsets: number[] = [];
    const newOffsets: number[] = [];

    // Each rendered slide belongs to a repeated "cycle" of the finite slide set.
    // This offset chooses which cycle to place that slide in so a single set of
    // DOM nodes can appear to wrap infinitely in the current scroll direction.
    memoizedSlides.forEach((_, index) => {
      let wrapCycleOffset: number | null = null;
      const threshold = 2;
      if (scrollDirection === SlideDirection.LEFT) {
        wrapCycleOffset = -Math.floor(
          (index - scrollIndex + threshold) / memoizedSlides.length,
        );
      } else if (scrollDirection === SlideDirection.RIGHT) {
        wrapCycleOffset = Math.floor(
          (scrollIndex - index + threshold) / memoizedSlides.length,
        );
      } else {
        throw new Error("No scroll direction set.");
      }
      newWrapCycleOffsets.push(wrapCycleOffset);
      const containerOffset = (wrapperWidth - slideWidth) / 2;
      newPositions.push(
        Math.round(
          wrapCycleOffset * slideSpacing * memoizedSlides.length +
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
      wrapCycleOffsets: newWrapCycleOffsets,
      offsets: newOffsets,
    };
  }, [
    scrollIndex,
    wrapperWidth,
    slideSpacing,
    memoizedSlides,
    scrollDirection,
    slideWidth,
  ]);

  const updateIndexPerPosition = useCallback(
    (scrollLeft: number, updateStableIndex: boolean = true) => {
      const totalSlides = memoizedSlides.length;
      const offset = scrollLeft - patchedOffset();
      const newScrollIndex = Math.round(offset / slideSpacing);
      const newDataIndex =
        ((newScrollIndex % totalSlides) + totalSlides) % totalSlides;

      if (scrollIndex !== newScrollIndex) {
        const newDirection =
          newScrollIndex > scrollIndex
            ? SlideDirection.LEFT
            : SlideDirection.RIGHT;
        if (newDirection !== scrollDirectionRef.current) {
          scrollDirectionRef.current = newDirection;
          setScrollDirection(newDirection);
        }
        setScrollIndex(newScrollIndex);
        onIndexUpdate?.(newDataIndex);
        if (stabilizationTimer.current)
          clearTimeout(stabilizationTimer.current);
        if (
          updateStableIndex &&
          scrollTriggerSource.current !== Source.PROGRAMMATIC
        ) {
          stabilizationTimer.current = setTimeout(() => {
            stableIndex.current = newDataIndex;
            setStableIndexValue(newDataIndex);
            onStabilizationUpdate?.(
              newDataIndex,
              scrollTriggerSource.current,
              newDirection,
            );

            // Track carousel interaction in CloudWatch RUM for visitor analytics
            // Only records user-initiated interactions (excludes programmatic/route-driven scrolls)
            // Master carousel only (slave carousels are decorative parallax layers)
            if (scrollTriggerSource.current === Source.SCROLL && !isSlaveMode) {
              // Distinguish between interaction methods for UX insights:
              // - carousel_mouse_drag: Desktop users dragging with mouse (GSAP Draggable)
              // - carousel_touch_swipe: Mobile/tablet native touch scrolling or trackpad gestures
              const interactionType = isMouseDragRef.current
                ? "carousel_mouse_drag"
                : "carousel_touch_swipe";

              recordEvent(interactionType, {
                slideIndex: newDataIndex, // Project index user navigated to
                direction:
                  newDirection === SlideDirection.LEFT ? "left" : "right",
                totalSlides: totalSlides, // Context for understanding navigation patterns
              });

              // Reset drag flag after tracking to avoid misattributing next interaction
              isMouseDragRef.current = false;
            }
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
      isSlaveMode,
    ],
  );

  const updateIndexRef = useRef(updateIndexPerPosition);
  useEffect(() => {
    updateIndexRef.current = updateIndexPerPosition;
  }, [updateIndexPerPosition]);

  const applyExternalVisualPosition = useCallback(
    (newLeft: number) => {
      externalScrollLeftRef.current = Math.round(newLeft);
      if (scrollerRef.current) {
        scrollerRef.current.style.transform = `translateX(${-newLeft}px)`;
      }
      if (debug) {
        setDebugScrollLeft(newLeft);
      }
    },
    [debug],
  );

  const emitImmediateScrollUpdate = useCallback(
    (scrollLeft: number) => {
      onImmediateScrollUpdateRef.current?.(scrollLeft - patchedOffset());
    },
    [patchedOffset],
  );

  const handleScroll = useCallback(() => {
    if (!scrollerRef.current) return;
    const currentLeft = scrollerRef.current.scrollLeft;
    updateIndexRef.current(currentLeft);
    if (debug) {
      setDebugScrollLeft(currentLeft);
    }
  }, [debug]);

  const targetFPS = 40;
  const frameDuration = 1000 / targetFPS;

  useEffect(() => {
    let animationFrameId: number | null = null;
    let lastFrameTime = 0;

    const scrollListener = (_: Event) => {
      if (isInitializingRef.current) return;
      // Keep slave layers visually locked to the master in the current frame.
      // Index and stabilization work continue on the throttled semantic path.
      if (scrollerRef.current) {
        emitImmediateScrollUpdate(scrollerRef.current.scrollLeft);
      }
      // If a route-driven tween is in progress but the user starts interacting,
      // hand control back to gesture-driven flow immediately.
      if (
        scrollTriggerSource.current === Source.PROGRAMMATIC &&
        (draggable?.current?.isDragging || draggable?.current?.isThrowing)
      ) {
        scrollTriggerSource.current = Source.SCROLL;
        // Cancel any in-flight tween to avoid fighting with native scroll.
        if (scrollerRef.current) {
          gsap.killTweensOf(scrollerRef.current, "scrollLeft");
        }
      }
      // Only enable snap after scroll has settled and no interactions are happening
      if (
        !draggable?.current?.isThrowing &&
        !draggable?.current?.isDragging &&
        scrollTriggerSource.current !== Source.PROGRAMMATIC &&
        snap !== "x mandatory"
      ) {
        // Add a small delay to ensure scroll has truly settled
        setTimeout(() => {
          if (
            !draggable?.current?.isThrowing &&
            !draggable?.current?.isDragging &&
            scrollTriggerSource.current !== Source.PROGRAMMATIC
          ) {
            setSnap("x mandatory");
          }
        }, 50);
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
  }, [
    handleScroll,
    frameDuration,
    draggable,
    emitImmediateScrollUpdate,
    isSlaveMode,
    snap,
  ]);

  const {
    positions: currentPositions,
    wrapCycleOffsets: currentWrapCycleOffsets,
    offsets: currentOffsets,
  } = useMemo(
    () => memoizedPositionsAndWrapCycleOffsets,
    [memoizedPositionsAndWrapCycleOffsets],
  );

  useLayoutEffect(() => {
    if (!scrollerRef.current) return;
    const totalSlides = memoizedSlides.length;
    const normalizedIndex =
      ((initialIndex % totalSlides) + totalSlides) % totalSlides;
    const currentDataIndex = deriveDataIndex(scrollIndexRef.current);
    const newScrollIndex =
      scrollIndexRef.current + (normalizedIndex - currentDataIndex);
    const targetScrollLeft = Math.round(
      newScrollIndex * slideSpacing + patchedOffset(),
    );

    // Treat initial positioning as programmatic so we don't schedule a delayed
    // stabilization update that can cause a one-time post-load page flicker.
    isInitializingRef.current = true;
    scrollTriggerSource.current = Source.PROGRAMMATIC;

    setScrollIndex(newScrollIndex);
    if (!isSlaveMode) scrollerRef.current.scrollLeft = targetScrollLeft;

    // Prime slave layers immediately (LayeredCarouselManager mirrors this value)
    // so the visual carousels render correctly before any user interaction.
    emitImmediateScrollUpdate(targetScrollLeft);
    onScrollUpdateRef.current?.(targetScrollLeft - patchedOffset());

    stableIndex.current = normalizedIndex;
    setStableIndexValue(normalizedIndex);
    // IMPORTANT:
    // Emit an initial stabilization update during first positioning.
    // Without this, parents that gate route-driven programmatic scrolls on
    // "first stabilization" won't unlock until the user manually scrolls.
    onStabilizationUpdateRef.current?.(
      normalizedIndex,
      Source.PROGRAMMATIC,
      scrollDirectionRef.current,
    );
    if (stabilizationTimer.current) clearTimeout(stabilizationTimer.current);

    const rafId = requestAnimationFrame(() => {
      isInitializingRef.current = false;
      scrollTriggerSource.current = Source.SCROLL;
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    initialIndex,
    isSlaveMode,
    memoizedSlides.length,
    slideSpacing,
    patchedOffset,
    deriveDataIndex,
    emitImmediateScrollUpdate,
  ]);

  useLayoutEffect(() => {
    const measureWidths = () => {
      const widths = slideRefs.current.map((ref) => ref?.offsetWidth || 0);
      const newSlideWidth = Math.max(...widths);
      const newWrapperWidth = wrapperRef.current?.offsetWidth || 0;
      if (newSlideWidth + newWrapperWidth > 0) {
        slideWidthRef.current = newSlideWidth;
        setSlideWidth(newSlideWidth);
        setWrapperWidth(newWrapperWidth);
      } else {
        requestAnimationFrame(measureWidths);
      }
    };
    measureWidths();
  }, [slides]);

  const onTweenComplete = useCallback(() => {
    setSnap("x mandatory");
    scrollTriggerSource.current = Source.SCROLL;
    const freshDataIndex = deriveDataIndex(scrollIndexRef.current);
    stableIndex.current = freshDataIndex;
    setStableIndexValue(freshDataIndex);
    onStabilizationUpdate?.(
      freshDataIndex,
      Source.PROGRAMMATIC,
      scrollDirectionRef.current,
    );
  }, [onStabilizationUpdate, deriveDataIndex]);

  // Stable reference for onComplete callback
  const onTweenCompleteRef = useRef(onTweenComplete);
  useEffect(() => {
    onTweenCompleteRef.current = onTweenComplete;
  }, [onTweenComplete]);

  useEffect(() => {
    if (scrollerRef.current && !scrollLeftTo.current) {
      scrollLeftTo.current = gsap.quickTo(scrollerRef.current, "scrollLeft", {
        overwrite: "auto",
        duration: 0.6,
        ease: "power1.out",
        onComplete: () => onTweenCompleteRef.current?.(),
      });
    }
  }, []); // Only create once

  useImperativeHandle(ref, () => ({
    scrollToSlide: (targetIndex: number) => {
      if (!scrollerRef.current) return;

      // Kill any existing tweens first
      gsap.killTweensOf(scrollerRef.current);

      setSnap("none");
      scrollTriggerSource.current = Source.PROGRAMMATIC;
      const offsetToTarget = currentOffsets[targetIndex];
      const direction =
        offsetToTarget > 0 ? SlideDirection.RIGHT : SlideDirection.LEFT;
      scrollDirectionRef.current = direction;
      setScrollDirection(direction);

      // Calculate the target scroll position to center the slide
      // Use the same calculation as the snap points
      const targetDataIndex =
        ((targetIndex % memoizedSlides.length) + memoizedSlides.length) %
        memoizedSlides.length;

      // Calculate how many steps we need to move from current position
      let steps = targetDataIndex - deriveDataIndex(scrollIndexRef.current);

      // Handle wrap-around for shortest path
      if (Math.abs(steps) > memoizedSlides.length / 2) {
        steps =
          steps > 0
            ? steps - memoizedSlides.length
            : steps + memoizedSlides.length;
      }

      const targetScrollIndex = scrollIndexRef.current + steps;
      const targetScrollLeft = Math.round(
        targetScrollIndex * slideSpacing + patchedOffset(),
      );

      const currentScrollLeft = scrollerRef.current.scrollLeft;
      const distanceToScroll = Math.abs(currentScrollLeft - targetScrollLeft);
      const duration = Math.min(2.0, 0.2 + distanceToScroll / 1500);

      // console.info("Scrolling to slide:", {
      //   targetIndex,
      //   targetDataIndex,
      //   steps,
      //   currentScrollLeft,
      //   targetScrollLeft,
      //   slideSpacing,
      //   scrollIndexRef: scrollIndexRef.current,
      //   targetScrollIndex,
      // });

      // Use direct scrollLeft animation instead of ScrollToPlugin
      gsap.to(scrollerRef.current, {
        scrollLeft: targetScrollLeft,
        duration,
        ease: "power1.out",
        overwrite: "auto",
        onUpdate: function () {
          // Ensure we're actually moving to prevent snap interference
          if (scrollerRef.current) {
            scrollTriggerSource.current = Source.PROGRAMMATIC;
            emitImmediateScrollUpdate(scrollerRef.current.scrollLeft);
          }
        },
        onComplete: () => onTweenCompleteRef.current?.(),
      });
    },
    setExternalVisualPosition: (newLeft: number) => {
      applyExternalVisualPosition(newLeft);
    },
    setExternalScrollPosition: (newLeft: number) => {
      applyExternalVisualPosition(newLeft);
      updateIndexPerPosition(newLeft, false);
    },
  }));

  const isDebug = () => Boolean(debug);

  return (
    <div ref={wrapperRef} className={getWrapperClass()}>
      {isDebug() && (
        <div className={styles.debug}>
          {scrollIndex} {stableIndexValue ?? ""} {debugScrollLeft}
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
                <div>Wrap cycle: {currentWrapCycleOffsets[index]}</div>
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
