import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
  memo,
} from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/all";

import {
  CarouselProps,
  Direction,
  Source,
  type SourceType,
  type DirectionType,
  type CarouselRef,
} from "./CarouselTypes";
import { useDragInertia } from "./useDragInertia";
import styles from "./Carousel.module.scss";

/**
 * Carousel Component
 * - Minimal state, for performance and smoothest user interaction possible.
 * - Bi-directional, infinite-scroll carousel with wrap-around behavior.
 * - Leverages browser-native HTML inertial touch/swipe trackpad/gesture scrolling for smooth interactions.
 * - Infinite scroll supporting master-slave architecture for synchronizing parallax effects.
 * - Built for performance and smooth user interaction with inertial scrolling and precise position tracking.
 * - Designed to handle various use cases, including custom scroll synchronization and routing.
 * - Slides are passed as props.
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
 *    - Resolution: Applied on a delay post-render to avoid recursion issues, which also allows for visual inpsection of alignment before being applied.
 *
 * 3. **Initial Offset:** Initially setting `scrollLeft` to the base offset requires the scroller to be shimmed/propped to the required width
 *    if there are no slides to the right of the initial index.
 *
 * TODO:
 * - Add non-native inertial scrolling as:
 *   1. An optional feature to unify the experience between different browser types.
 *   2. Enable inertial scroll for mouse-based drag and flick.
 * - Clone slides dynamically to prevent blank spaces at edges.
 * - Implement lazy loading for slides and ensure proper wrapping of slider positions.
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
 */
const Carousel = memo(
  forwardRef<CarouselRef, CarouselProps>((props, ref) => {
    const {
      slides,
      slideSpacing,
      initialIndex = 0,
      onIndexUpdate,
      debug = 0,
      wrapperClassName = "",
      slideClassName = "",
      sliderClassName = "",
      onScrollUpdate,
      onStabilizationUpdate,
      stabilizationDelay = 800,
    } = props;
    // State Variables
    const [scrollIndex, setScrollIndex] = useState(initialIndex); // Current scroll index.
    const [wrapperWidth, setWrapperWidth] = useState<number>(0); // Current width of the wrapper, (by design, this could change per responsiveness, but so far this is untested.)
    const [snap, setSnap] = useState<"none" | "x mandatory">("none"); // CSS scroll snap behavior, can cause perplexing problems is not managed appropriately.

    // Refs for DOM elements and values
    // TODO: Prevent stabilization while user is still dragging...
    const stabilizationTimer = useRef<NodeJS.Timeout | null>(null); // Timer for stabilization.
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]); // References to slide elements.
    const scrollerRef = useRef<HTMLDivElement>(null); // Reference to the scrolling container.
    const wrapperRef = useRef<HTMLDivElement>(null); // Reference to the wrapper.
    const externalScrollLeftRef = useRef<number | null>(null); // External scroll position in slave mode.
    const slideWidthRef = useRef<number>(0); // Current width of a slide (shouldn't change after initial render).
    const scrollTriggerSource = useRef<SourceType>(Source.NATURAL); // Track the source of the scroll
    const scrollLeftTo = useRef<((value: number) => void) | null>(null);
    const scrollDirectionRef = useRef<DirectionType>(Direction.LEFT);
    const stableIndex = useRef<number | null>(initialIndex);
    const scrollIndexRef = useRef<number>(initialIndex);

    // Checks if the carousel is in slave mode.
    const isSlave = () => typeof externalScrollLeftRef.current === "number";

    const dragInertia = !isSlave()
      ? useDragInertia(scrollerRef)
      : { isDragging: false };

    // Memoized slides for optimized re-renders
    const memoizedSlides = useMemo(() => slides, [slides]);

    useEffect(() => {
      scrollIndexRef.current = scrollIndex;
    }, [scrollIndex]);

    /**
     * Derives the normalized dataIndex from the current scrollIndex.
     * Ensures the resulting index is within the bounds of 0 to slides.length - 1.
     *
     * @returns The normalized data index (0 to slides.length - 1).
     */
    const deriveDataIndex = useCallback(
      (overrideScrollIndex?: number): number => {
        const slidesLength = slides.length;

        overrideScrollIndex =
          typeof overrideScrollIndex === "number"
            ? overrideScrollIndex
            : scrollIndexRef.current;

        return (
          ((scrollIndexRef.current % slidesLength) + slidesLength) %
          slidesLength
        );
      },
      [],
    );

    const dataIndex = useMemo(() => deriveDataIndex(), []);

    // Calculate slide positions, multipliers, and offsets
    const memoizedPositionsAndMultipliers = useMemo(() => {
      // Helper arrays for computed values
      const newPositions: number[] = [];
      const newMultipliers: number[] = [];
      const newOffsets: number[] = [];

      memoizedSlides.forEach((_, index) => {
        let multiplier: number | null = null;
        if (scrollDirectionRef.current === Direction.LEFT) {
          const threshold = 2;
          multiplier = -Math.floor(
            (index - scrollIndex + threshold) / memoizedSlides.length,
          );
        } else if (scrollDirectionRef.current === Direction.RIGHT) {
          const threshold = 2;
          multiplier = Math.floor(
            (scrollIndex - index + threshold) / memoizedSlides.length,
          );
        } else {
          throw new Error("No scroll direction set.");
        }

        newMultipliers.push(multiplier);

        // Calculate absolute position for each slide.
        const containerOffset = (wrapperWidth - slideWidthRef.current) / 2;
        newPositions.push(
          Math.round(
            multiplier * slideSpacing * memoizedSlides.length +
              index * slideSpacing +
              containerOffset,
          ),
        );

        // Calculate normalized offsets for determining visibility and snapping.
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
    }, [scrollIndex, wrapperWidth]);

    // Updates the carousel's index based on scroll position.
    const updateIndexPerPosition = (
      scrollLeft: number,
      updateStableIndex: boolean = true,
    ) => {
      const totalSlides = memoizedSlides.length;

      // Calculate the new scroll index and data index based on scrollLeft.
      const offset = scrollLeft - patchedOffset();
      const newScrollIndex = Math.round(offset / slideSpacing);
      const newDataIndex =
        ((newScrollIndex % totalSlides) + totalSlides) % totalSlides;

      if (scrollIndex !== newScrollIndex) {
        const newDirection =
          newScrollIndex > scrollIndex ? Direction.LEFT : Direction.RIGHT;

        // Update the scroll direction if it has changed.
        if (newDirection !== scrollDirectionRef.current) {
          scrollDirectionRef.current = newDirection;
        }

        // Update states and trigger callbacks for the new index.
        setScrollIndex(newScrollIndex);
        onIndexUpdate?.(newDataIndex);

        // Clear any existing stabilization timer before setting a new one.
        if (stabilizationTimer.current) {
          clearTimeout(stabilizationTimer.current);
        }

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

      // Trigger the scroll update callback with the adjusted scrollLeft.
      onScrollUpdate?.(scrollLeft - patchedOffset());
    };

    // Keeps the updateIndexPerPosition function reference stable across renders.
    const updateIndexRef = useRef(updateIndexPerPosition);
    useEffect(() => {
      updateIndexRef.current = updateIndexPerPosition;
    }, [updateIndexPerPosition]);

    // Handles scroll events by updating the index based on current scroll position.
    const handleScroll = useCallback(() => {
      if (!scrollerRef.current) return;
      const scrollLeft = scrollerRef.current.scrollLeft;
      updateIndexRef.current(scrollLeft);
    }, []);

    // Throttle scroll updates to the target FPS for performance.
    const targetFPS = 40;
    const frameDuration = 1000 / targetFPS;
    let lastFrameTime = 0;

    useEffect(() => {
      let animationFrameId: number | null = null;

      // Listener to manage scroll updates while throttling based on FPS.
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

      // Only attach scroll listener if not in slave mode.
      if (!isSlave()) {
        const scroller = scrollerRef.current;
        scroller?.addEventListener("scroll", scrollListener);

        return () => {
          scroller?.removeEventListener("scroll", scrollListener);
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
      }
    }, [handleScroll, frameDuration]);

    // Returns the base offset used for infinite scrolling.
    const patchedOffset = () => (isSlave() ? 0 : BASE_OFFSET);

    // Extracts current positions, multipliers, and offsets for slides.
    const {
      positions: currentPositions,
      multipliers: currentMultipliers,
      offsets: currentOffsets,
    } = useMemo(() => {
      const { positions, multipliers, offsets } =
        memoizedPositionsAndMultipliers;
      return { positions, multipliers, offsets };
    }, [memoizedPositionsAndMultipliers]);

    // Initializes the carousel's scroll position and snap behavior.
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

      if (!isSlave()) {
        scrollerRef.current.scrollLeft = targetScrollLeft;
      }

      // Multipurpose delay for applying `scroll-snap-type`.
      // Delay prevents weird recursion that happens if alignment isn't perfect.
      // (this also helps visually identify that, since it should never happen.)
      // also triggers a rerender necessary in some browsers (Safari desktop) to
      // guarantee a paint after initial layout is run. Doesn't work if it's less
      // than 150ms or so.
      const timer = setTimeout(() => {
        setSnap("x mandatory");
      }, 150);

      return () => clearTimeout(timer);
    }, []);

    // Measures slide and wrapper widths for accurate positioning.
    useEffect(() => {
      const measureWidths = () => {
        const widths = slideRefs.current.map((ref) => ref?.offsetWidth || 0);
        const newSlideWidth = Math.max(...widths);
        const newWrapperWidth = wrapperRef.current?.offsetWidth || 0;

        if (newSlideWidth + newWrapperWidth > 0) {
          slideWidthRef.current = newSlideWidth;
          setWrapperWidth(newWrapperWidth);
        } else {
          // Retry measuring if dimensions are unavailable.
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
    }, [onStabilizationUpdate]);

    useEffect(() => {
      if (scrollerRef.current) {
        scrollLeftTo.current = gsap.quickTo(scrollerRef.current, "scrollLeft", {
          overwrite: "auto",
          duration: 0.6,
          ease: "power1.out",
          onComplete: onTweenComplete,
        });
      }
    }, []);

    // Exposes carousel methods to the parent component via `ref`.
    useImperativeHandle(ref, () => ({
      // Scrolls programmatically to a specific slide.
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

        // Calculate dynamic duration based on the distance to scroll
        const currentScrollLeft = scrollerRef.current.scrollLeft;
        const distanceToScroll = Math.abs(currentScrollLeft - targetPosition);
        const duration = Math.min(2.0, 0.2 + distanceToScroll / 1500);

        // Dynamically update the tween duration
        scrollLeftTo.current = gsap.quickTo(scrollerRef.current, "scrollLeft", {
          overwrite: "auto",
          duration,
          ease: "power1.out",
          onComplete: onTweenComplete,
        });

        // Use the existing `scrollLeftTo` without recreating it
        scrollLeftTo.current(targetPosition);
      },
      // Adjusts the external scroll position in slave mode.
      setExternalScrollPosition: (newLeft: number) => {
        externalScrollLeftRef.current = Math.round(newLeft);
        if (scrollerRef.current) {
          scrollerRef.current.style.transform = `translateX(${-newLeft}px)`;
        }
        updateIndexPerPosition(newLeft, false);
      },
    }));

    // Checks if debug mode is enabled.
    const isDebug = () => debug != null && debug !== 0 && debug !== "";

    return (
      <div
        ref={wrapperRef}
        className={
          `${styles["carousel-wrapper"]} ${isSlave() ? styles["slave-wrapper"] : ""} ` +
          wrapperClassName
        }
      >
        {isDebug() && (
          <div className={styles["debug"]}>
            {scrollIndex} {stableIndex.current}{" "}
            {scrollerRef.current?.scrollLeft}
          </div>
        )}
        <div
          ref={scrollerRef}
          className={`${styles["carousel-slider"]} ${sliderClassName}`}
          style={{ scrollSnapType: snap }}
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
  }),
);

gsap.registerPlugin(ScrollToPlugin);

// BASE_OFFSET accounts for that HTML elements don't scroll
// to negative scrollLeft. TODO: This can be handled in a way that instead
// repositions the slides and scroll position when the user
// scroll stops. It works, I've done it elsewhere, but it's not critical for
// current use cases. Until then, it's not *technically* infinite scrolling left.
const BASE_OFFSET = 1000000;

export default Carousel;
