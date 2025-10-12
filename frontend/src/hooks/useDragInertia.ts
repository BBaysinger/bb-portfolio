import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { useEffect, useRef } from "react";

import useActivePointerType from "./useActivePointerType";

gsap.registerPlugin(Draggable, InertiaPlugin);

interface DraggableState {
  isDragging: boolean;
  isThrowing: boolean;
}

export function useDragInertia(
  scrollerRef: React.RefObject<HTMLElement | null>,
  setSnap: React.Dispatch<React.SetStateAction<"none" | "x mandatory">>,
  slideSpacing: number,
  isSlaveMode: boolean,
  wrapperWidth: number,
  slideWidthRef: React.MutableRefObject<number>
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

    const offset = -79; // HACK: Hardcoded for now (from original)

    const draggable = Draggable.create(scroller, {
      type: "scrollLeft", // NOTE: Mutates the DOM by nesting the scroller
      allowNativeTouchScrolling: true,
      inertia: true,
      throwProps: true, // Enables smooth inertia-based scrolling
      cursor: "grab",
      snap: function (endValue) {
        const velocity = this.tween ? this.tween.getVelocity() : 0; // GSAP velocity
        const threshold = slideSpacing * 0.3;
        const remainder = Math.abs(endValue % slideSpacing);

        let retVal;
        if (Math.abs(velocity) > 300 || remainder > threshold) {
          // If velocity is high or user drags beyond threshold, move to next slide
          retVal = -Math.round(endValue / slideSpacing) * slideSpacing + offset;
        } else {
          // Otherwise, snap to the current one
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
      },
    })[0];

    draggableRef.current = draggable;

    return () => {
      draggable.kill(); // Clean up GSAP instance
    };
  }, [scrollerRef, setSnap, slideSpacing, isSlaveMode, pointerType]);

  return dragState;
}

export default useDragInertia;
