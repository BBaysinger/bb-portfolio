import { useEffect, useRef } from "react";

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export function useDebouncedResizeObserver<T extends Element>(
  targetRef: React.RefObject<T | null>,
  callback: () => void,
  delay = 50,
) {
  const debounceRef = useRef<number>(-1);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(callback, delay);
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(debounceRef.current);
    };
  }, [targetRef, callback, delay]);
}
