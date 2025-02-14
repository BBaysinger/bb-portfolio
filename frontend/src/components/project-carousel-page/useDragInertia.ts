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
) => {
  const [isDragging, setIsDragging] = useState(false);
  const velocityRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handlePointerDown = (e: PointerEvent) => {
      setIsDragging(true);
      startXRef.current = e.clientX;
      scrollLeftRef.current = carousel.scrollLeft;
      velocityRef.current = 0;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
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
      const slideWidth = carousel.clientWidth;
      const index = Math.round(carousel.scrollLeft / slideWidth);
      const target = index * slideWidth;
      animateTo(target);
    };

    const animateTo = (target: number) => {
      if (Math.abs(target - carousel.scrollLeft) < 1) {
        carousel.scrollLeft = target;
        return;
      }
      carousel.scrollLeft += (target - carousel.scrollLeft) * 0.1;
      animationRef.current = requestAnimationFrame(() => animateTo(target));
    };

    carousel.addEventListener("pointerdown", handlePointerDown);
    carousel.addEventListener("pointermove", handlePointerMove);
    carousel.addEventListener("pointerup", handlePointerUp);
    carousel.addEventListener("pointerleave", handlePointerUp);

    return () => {
      carousel.removeEventListener("pointerdown", handlePointerDown);
      carousel.removeEventListener("pointermove", handlePointerMove);
      carousel.removeEventListener("pointerup", handlePointerUp);
      carousel.removeEventListener("pointerleave", handlePointerUp);
    };
  }, [isDragging, carouselRef]);

  return { isDragging };
};
