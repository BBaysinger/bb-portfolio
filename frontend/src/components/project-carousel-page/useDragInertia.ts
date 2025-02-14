import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin);

/**
 * Custom hook to handle click/drag/inertia for a carousel component.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export const useDragInertia = (
    carouselRef: React.RefObject<HTMLDivElement | null>,
    setSnap: React.Dispatch<React.SetStateAction<"none" | "x mandatory">>,
    slideSpacing: number,
    isSlave: boolean
  ) => {
    const draggableRef = useRef<Draggable | null>(null);
  
    useEffect(() => {
      const carousel = carouselRef.current;
      if (!carousel || isSlave) return;
  
      // Disable snapping when dragging starts
      const handlePress = () => setSnap("none");
  
      // Re-enable snapping when dragging ends
      const handleRelease = () => setSnap("x mandatory");
  
      const draggable = Draggable.create(carousel, {
        type: "x",
        inertia: true,
        edgeResistance: 0.75, // Adds slight resistance at the edges
        bounds: carousel.parentElement || carousel, // Prevents dragging too far
        throwProps: true, // Enables smooth inertia-based scrolling
        cursor: "grab",
        onPress: () => {
          gsap.set(carousel, { cursor: "grabbing" });
          handlePress();
        },
        onRelease: () => {
          gsap.set(carousel, { cursor: "grab" });
          handleRelease();
        },
      })[0];
  
      draggableRef.current = draggable;
  
      return () => {
        draggable.kill(); // Clean up GSAP instance
      };
    }, [carouselRef, setSnap, slideSpacing, isSlave]);
  
    return { draggable: draggableRef.current };
  };