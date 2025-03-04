import { useEffect, useRef } from "react";

const useInViewArray = (
  animationClass: string,
  threshold = 0.2,
  baseClass = "fade-in",
  delay = 1000, // Delay in milliseconds (default: 1 second)
  scrollThreshold = 100, // How much the user needs to be scrolled down to trigger delay
) => {
  const elementsRef = useRef<HTMLElement[]>([]);

  const addToRefs = (el: HTMLElement | null) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
      el.classList.add(baseClass); // Automatically add the "fade-in" class
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(animationClass);
            observer.unobserve(entry.target); // Stop observing once animated
          }
        });
      },
      { threshold },
    );

    // Check if the user is already scrolled down
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
