import { useEffect, useRef } from "react";

/**
 * Adds a class to designated elements when they come into view.
 *
 * @param animationClass
 * @param threshold
 * @param baseClass
 * @param delay
 * @param scrollThreshold
 * @returns
 */
const useInViewArray = (
  animationClass: string,
  threshold = 0.2,
  baseClass = "fadeIn",
  delay = 500,
  scrollThreshold = 100,
) => {
  const elementsRef = useRef<(HTMLElement | SVGElement)[]>([]);

  const addToRefs = (el: HTMLElement | SVGElement | null) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
      el.classList.add(baseClass);
    }
  };

  useEffect(() => {
    const processedTargets = new WeakSet<Element>();
    const scheduledRafs = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Elements that start in the viewport can otherwise skip the transition,
            // because the "in-view" class can be applied before the first paint.
            // Scheduling on the next task ensures a paint occurs with `baseClass` first.
            if (processedTargets.has(entry.target)) return;
            processedTargets.add(entry.target);

            observer.unobserve(entry.target);
            const target = entry.target;

            const rafId = window.requestAnimationFrame(() => {
              const rafId2 = window.requestAnimationFrame(() => {
                scheduledRafs.delete(rafId2);

                if (
                  !(
                    target instanceof HTMLElement ||
                    target instanceof SVGElement
                  )
                ) {
                  return;
                }
                if (!target.isConnected) {
                  return;
                }
                target.classList.add(animationClass);
              });
              scheduledRafs.add(rafId2);
            });
            scheduledRafs.add(rafId);
          }
        });
      },
      { threshold },
    );

    const shouldDelay = window.scrollY > scrollThreshold;

    const timeoutId = shouldDelay
      ? setTimeout(() => {
          elementsRef.current.forEach((el) => observer.observe(el));
        }, delay)
      : (() => {
          elementsRef.current.forEach((el) => observer.observe(el));
          return null;
        })();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      scheduledRafs.forEach((id) => cancelAnimationFrame(id));
      observer.disconnect();
    };
  }, [animationClass, threshold, delay, scrollThreshold]);

  return addToRefs;
};

export default useInViewArray;
