import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

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
) => {
  const draggableRef = useRef<Draggable | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || isSlave) return;

    // Disable snapping when dragging starts
    const handlePress = () => setSnap("none");

    // Re-enable snapping when dragging ends
    // const handleRelease = () => setSnap("x mandatory");

    const draggable = Draggable.create(scroller, {
      type: "scrollLeft", // NOTE: Mutates the DOM by nesting the scroller
      allowNativeTouchScrolling: true,
      inertia: true,
      throwProps: true, // Enables smooth inertia-based scrolling
      cursor: "grab",
      onPress: () => {
        gsap.set(scroller, { cursor: "grabbing" });
        handlePress();
      },
      onRelease: () => {
        gsap.set(scroller, { cursor: "grab" });
        // handleRelease();
      },
    })[0];

    draggableRef.current = draggable;

    return () => {
      draggable.kill(); // Clean up GSAP instance
    };
  }, [scrollerRef, setSnap, slideSpacing, isSlave]);

  return { draggable: draggableRef.current };
};
