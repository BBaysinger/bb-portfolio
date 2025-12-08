/**
 * useDragInertia Hook
 *
 * Provides mouse-based drag-and-flick interaction for carousel scrolling using GSAP.
 * Only activates when a mouse pointer is detected, allowing native touch scrolling
 * on touch devices for optimal performance and browser-native inertia.
 *
 * Features:
 * - Mouse-only activation (touch devices use native scroll)
 * - Inertial throwing with velocity-based snap points
 * - Grabbing cursor feedback
 * - Configurable snap threshold based on velocity and distance
 * - Callbacks for drag lifecycle events
 *
 * Integration:
 * - Works with master carousel only (isSlaveMode skips initialization)
 * - Coordinates with scroll snap behavior via setSnap callback
 * - Triggers optional onDragComplete callback for analytics/tracking
 *
 * @example
 * ```tsx
 * const dragState = useDragInertia(
 *   scrollerRef,
 *   setSnap,
 *   slideSpacing,
 *   isSlaveMode,
 *   wrapperWidth,
 *   slideWidthRef,
 *   () => recordEvent('carousel_drag')
 * );
 * ```
 */

import gsap from "gsap";
import { Draggable } from "gsap/draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { useEffect, useRef } from "react";

import useActivePointerType from "./useActivePointerType";

gsap.registerPlugin(Draggable, InertiaPlugin);

/**
 * Drag state tracked for carousel interaction coordination
 */
interface DraggableState {
  isDragging: boolean;
  isThrowing: boolean;
}

/**
 * Enables mouse-based drag-and-flick interaction for carousel scrolling.
 *
 * @param scrollerRef - Reference to the scrollable carousel element
 * @param setSnap - Callback to control CSS scroll-snap behavior ("none" while dragging, "x mandatory" when settled)
 * @param slideSpacing - Pixel spacing between slide centers, used for snap point calculation
 * @param isSlaveMode - If true, drag interaction is disabled (slave carousels follow master)
 * @param wrapperWidth - Outer container width for centering calculations
 * @param slideWidthRef - Reference to current slide width
 * @param onDragComplete - Optional callback fired when drag throw animation completes
 * @returns Drag state ref for coordination with scroll listeners
 */
export function useDragInertia(
  scrollerRef: React.RefObject<HTMLElement | null>,
  setSnap: React.Dispatch<React.SetStateAction<"none" | "x mandatory">>,
  slideSpacing: number,
  isSlaveMode: boolean,
  wrapperWidth: number,
  slideWidthRef: React.MutableRefObject<number>,
  onDragComplete?: () => void,
) {
  const draggableRef = useRef<Draggable | null>(null);
  const containerOffsetRef = useRef<number>(0);
  const pointerType = useActivePointerType();

  // Keep the drag state for compatibility with existing code
  const dragState = useRef<DraggableState>({
    isDragging: false,
    isThrowing: false,
  });

  useEffect(() => {
    containerOffsetRef.current = (wrapperWidth - slideWidthRef.current) / 2;
  }, [wrapperWidth, slideWidthRef]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || isSlaveMode || pointerType !== "mouse") return;

    // Disable snapping when dragging starts
    const handlePress = () => {
      setSnap("none");
      dragState.current.isDragging = true;
      dragState.current.isThrowing = false;
    };

    // Legacy offset for snap point alignment
    // TODO: Make this configurable (legacy value from original implementation)
    const offset = -79;

    const draggable = Draggable.create(scroller, {
      type: "scrollLeft", // NOTE: Mutates the DOM by nesting the scroller
      allowNativeTouchScrolling: true,
      inertia: true,
      throwProps: true, // Enables smooth inertia-based scrolling
      cursor: "grab",
      // Snap function determines final resting position after drag/throw
      // Considers both velocity (flick speed) and distance dragged
      snap: function (endValue: number) {
        const velocity = this.tween ? this.tween.getVelocity() : 0;
        const threshold = slideSpacing * 0.3; // 30% of slide width triggers next slide
        const remainder = Math.abs(endValue % slideSpacing);

        let retVal;
        if (Math.abs(velocity) > 300 || remainder > threshold) {
          // High velocity flick or significant drag: advance to next slide
          retVal = -Math.round(endValue / slideSpacing) * slideSpacing + offset;
        } else {
          // Low velocity or minimal drag: return to current slide
          retVal = -Math.floor(endValue / slideSpacing) * slideSpacing + offset;
        }

        return retVal;
      },
      onPress: () => {
        gsap.set(scroller, { cursor: "grabbing" });
        handlePress();
      },
      onRelease: () => {
        gsap.set(scroller, { cursor: "grab" });
        dragState.current.isDragging = false;
      },
      onThrowUpdate: () => {
        dragState.current.isThrowing = true;
      },
      onThrowComplete: () => {
        dragState.current.isThrowing = false;
        setSnap("x mandatory");
        onDragComplete?.();
      },
    })[0];

    draggableRef.current = draggable;

    return () => {
      draggable.kill(); // Clean up GSAP instance
    };
  }, [
    scrollerRef,
    setSnap,
    slideSpacing,
    isSlaveMode,
    pointerType,
    onDragComplete,
  ]);

  return dragState;
}

export default useDragInertia;
