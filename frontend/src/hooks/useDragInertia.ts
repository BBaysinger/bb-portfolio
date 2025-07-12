import { useEffect, useRef } from "react";

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
  slideWidthRef: React.MutableRefObject<number>,
) {
  // Always return a ref to keep the return type consistent
  const dragState = useRef<DraggableState>({
    isDragging: false,
    isThrowing: false,
  });

  useEffect(() => {
    if (isSlaveMode || !scrollerRef.current) return;

    const el = scrollerRef.current;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      dragState.current.isDragging = true;
      setSnap("none");
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.classList.add("dragging");
    };

    const onMouseLeave = () => {
      if (!isDown) return;
      isDown = false;
      dragState.current.isDragging = false;
      el.classList.remove("dragging");
      // Optional: handle inertia or momentum here
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      dragState.current.isDragging = false;
      el.classList.remove("dragging");
      // Optional: handle inertia or momentum here
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1; // Speed multiplier
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
    };
  }, [
    isSlaveMode,
    scrollerRef,
    setSnap,
    slideSpacing,
    wrapperWidth,
    slideWidthRef,
  ]);

  return dragState;
}

export default useDragInertia;
