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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(animationClass);
            observer.unobserve(entry.target);
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
      observer.disconnect();
    };
  }, [animationClass, threshold, delay, scrollThreshold]);

  return addToRefs;
};

export default useInViewArray;
