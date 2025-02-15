import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin);

/**
 * Custom hook to handle click/drag/inertia for a carousel component.
 * Reference:
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

    console.log(isSlave);
    // Disable snapping when dragging starts
    const handlePress = () => setSnap("none");

    // Re-enable snapping when dragging ends
    // const handleRelease = () => setSnap("x mandatory");

    // console.log("scroller", scroller);

    const draggable = Draggable.create(scroller, {
      type: "scrollLeft",
        allowNativeTouchScrolling: true,
        force3D: false,
        trigger: scroller, // Ensures it uses the correct element
        inertia: true,
        edgeResistance: 0.75, // Adds slight resistance at the edges
        bounds: scroller.parentElement || scroller, // Prevents dragging too far
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
