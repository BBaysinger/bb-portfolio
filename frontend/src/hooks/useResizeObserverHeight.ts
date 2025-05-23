import { useEffect, useState, MutableRefObject } from "react";

export function useResizeObserverHeight<T extends HTMLElement>(
  ref: MutableRefObject<T | null>,
): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect) {
        setHeight(entry.contentRect.height);
      }
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return height;
}
