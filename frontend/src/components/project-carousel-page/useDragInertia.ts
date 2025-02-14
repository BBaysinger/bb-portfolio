import { useRef, useState, useEffect } from "react";

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
  isSlave: boolean,
) => {
  const [isDragging, setIsDragging] = useState(false);
  const velocityRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || isSlave) return;

    const handlePointerDown = (e: PointerEvent) => {
      setIsDragging(true);
      setSnap("none"); // Disable snapping when dragging starts
      startXRef.current = e.clientX;
      scrollLeftRef.current = carousel.scrollLeft;
      velocityRef.current = 0;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      carousel.style.cursor = "grabbing";
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startXRef.current;
      carousel.scrollLeft = scrollLeftRef.current - deltaX;
      velocityRef.current = deltaX; // Capture velocity
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      applyInertia();

      carousel.style.cursor = "grab";
    };

    const applyInertia = () => {
      if (Math.abs(velocityRef.current) < 0.5) {
        snapToClosest();
        return;
      }
      carousel.scrollLeft -= velocityRef.current;
      velocityRef.current *= 0.95; // Apply friction
      animationRef.current = requestAnimationFrame(applyInertia);
    };

    const snapToClosest = () => {
      const index = Math.round(carousel.scrollLeft / slideSpacing);
      const target = index * slideSpacing;
      animateTo(target);
    };

    const animateTo = (target: number) => {
      if (Math.abs(target - carousel.scrollLeft) < 1) {
        carousel.scrollLeft = target;
        setSnap("x mandatory"); // Re-enable snap after inertia stops
        return;
      }
      carousel.scrollLeft += (target - carousel.scrollLeft) * 0.1;
      animationRef.current = requestAnimationFrame(() => animateTo(target));
    };

    carousel.addEventListener("pointerdown", handlePointerDown);
    carousel.addEventListener("pointermove", handlePointerMove);
    carousel.addEventListener("pointerup", handlePointerUp);
    carousel.addEventListener("pointerleave", handlePointerUp);

    carousel.style.cursor = "grab";

    return () => {
      carousel.removeEventListener("pointerdown", handlePointerDown);
      carousel.removeEventListener("pointermove", handlePointerMove);
      carousel.removeEventListener("pointerup", handlePointerUp);
      carousel.removeEventListener("pointerleave", handlePointerUp);
    };
  }, [isDragging, carouselRef, setSnap, isSlave, slideSpacing]);

  return { isDragging };
};
