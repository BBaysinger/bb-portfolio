import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

import useActivePointerType from "./useActivePointerType";

gsap.registerPlugin(Draggable, InertiaPlugin);

/**
 * Custom hook to handle click/drag/inertia for mouse/pointer input.
 * One reason this is separate is that it uses GSAP's InertiaPlugin, which
 * is a paid subscription feature. And we may want different/optional
 * strategies in the future. The user inputs built into the carousel are
 * browser-native, and this merely completes the component with expected
 * experience/behavior.
 *
 * References:
 * https://gsap.com/community/forums/topic/33288-gsap-observer-velocity-drag/
 * https://gsap.com/community/forums/topic/32443-draggable-infinite-carousel-with-snap-and-indexing/
 * Uses GSAP Draggable + InertiaPlugin, but only responds to mouse input.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export const useDragInertia = (
  scrollerRef: React.RefObject<HTMLDivElement | null>,
  setSnap: React.Dispatch<React.SetStateAction<"none" | "x mandatory">>,
  slideSpacing: number,
  isSlave: boolean,
  wrapperWidth: number,
  slideWidth: React.RefObject<number>,
) => {
  const draggableRef = useRef<Draggable | null>(null);
  const containerOffsetRef = useRef<number>(0);
  const pointerType = useActivePointerType();

  useEffect(() => {
    containerOffsetRef.current = (wrapperWidth - slideWidth.current) / 2;
  }, [wrapperWidth, slideWidth]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || isSlave || pointerType !== "mouse") return;

    // Disable snapping when dragging starts
    const handlePress = () => setSnap("none");
    const offset = -79; // HACK: Hardcoded for now.

    const draggable = Draggable.create(scroller, {
      type: "scrollLeft", // NOTE: Mutates the DOM by nesting the scroller
      allowNativeTouchScrolling: true,
      inertia: true,
      throwProps: true, // Enables smooth inertia-based scrolling
      cursor: "grab",
      // snap: (endValue) => {
      //   const retVal = -Math.round(endValue / slideSpacing) * slideSpacing + offset;
      //   return retVal;
      // },
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
      },
      onThrowComplete: () => {
        setSnap("x mandatory");
      },
    })[0];

    draggableRef.current = draggable;

    return () => {
      draggable.kill(); // Clean up GSAP instance
    };
  }, [scrollerRef, setSnap, slideSpacing, isSlave]);

  return draggableRef;
};
