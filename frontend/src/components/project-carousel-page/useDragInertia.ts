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

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setSnap("none"); // Disable snapping when dragging starts
      startXRef.current = e.clientX;
      scrollLeftRef.current = carousel.scrollLeft;
      velocityRef.current = 0;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      carousel.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startXRef.current;
      carousel.scrollLeft = scrollLeftRef.current - deltaX;
      velocityRef.current = deltaX; // Capture velocity
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      applyInertia();

      carousel.style.cursor = "grab";
    };

    const applyInertia = () => {
      if (!carousel) return;

      // Stop if velocity is low enough
      if (Math.abs(velocityRef.current) < 0.1) {
        velocityRef.current = 0;
        return;
      }

      carousel.scrollLeft -= velocityRef.current;
      velocityRef.current *= 0.95; // Apply friction

      animationRef.current = requestAnimationFrame(applyInertia);
    };

    carousel.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    carousel.style.cursor = "grab";

    return () => {
      carousel.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, carouselRef, setSnap, isSlave, slideSpacing]);

  return { isDragging };
};
