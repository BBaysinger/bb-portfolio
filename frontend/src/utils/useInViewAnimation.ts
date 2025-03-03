import { useEffect, useRef } from "react";

const useInViewArray = (
  animationClass: string,
  threshold = 0.2,
  baseClass = "fade-in",
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

    elementsRef.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [animationClass, threshold]);

  return addToRefs;
};

export default useInViewArray;
