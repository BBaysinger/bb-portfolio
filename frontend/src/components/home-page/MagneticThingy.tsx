import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import styles from "./MagneticThingy.module.scss";

type MagneticThingyProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Thingy that magnetically sticks to your pointer. Wags gently to attract attention
 * until the user interacts with it via mouse or touch. Then sticks to the pointer.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const MagneticThingy: React.FC<MagneticThingyProps> = ({
  children,
  className = "",
}) => {
  const [isInteracting, setIsInteracting] = useState(false);

  const elemRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projectionWrapperRef = useRef<HTMLDivElement | null>(null);

  const isInteractingRef = useRef(false);
  // const waveTL = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const elem = elemRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const projectionWrapper = projectionWrapperRef.current;
    if (!elem || !svg || !path || !projectionWrapper) return;

    let bounds = path.getBoundingClientRect();

    const updateDimensions = () => {
      bounds = path.getBoundingClientRect();
    };

    const magnetize = (val: number, axisSize: number) => {
      const dist = gsap.utils.normalize(0, axisSize / 2, Math.abs(val));
      return gsap.utils.interpolate([1, 0.4, 0], dist);
    };

    const pauseWave = () => {
      if (!isInteractingRef.current) {
        isInteractingRef.current = true;
        setIsInteracting(true); // trigger CSS class removal
      }
    };

    const moveEvent = (x: number, y: number, e?: Event) => {
      pauseWave();

      const viewportX = x - window.scrollX;
      const viewportY = y - window.scrollY;

      const elementUnderPointer = document.elementFromPoint(
        viewportX,
        viewportY,
      );
      if (!elementUnderPointer || elementUnderPointer !== path) {
        leaveEvent();
        return;
      }

      e?.preventDefault();

      const { left, top, width, height } = bounds;
      const adjustedLeft = left + window.scrollX;
      const adjustedTop = top + window.scrollY;

      const relX = x - adjustedLeft - width / 2;
      const relY = y - adjustedTop - height / 2;
      const moveX = magnetize(relX, width);
      const moveY = magnetize(relY, height);

      const xValue = moveX * relX * 0.1;
      const yValue = moveY * relY * 0.9;
      const rotation = (relX / width) * 15;

      gsap.to(elem, {
        x: xValue,
        y: yValue,
        rotation,
        ease: "power2.out",
      });

      gsap.to(projectionWrapper, {
        x: xValue * -0.5,
        y: yValue * 0.2,
        ease: "power2.out",
      });
    };

    const leaveEvent = () => {
      gsap.to(elem, {
        x: 0,
        y: 0,
        rotation: 0,
        ease: "elastic.out(1, 0.5)",
        duration: 1,
      });

      gsap.to(projectionWrapper, {
        x: 0,
        y: 0,
        ease: "elastic.out(1, 0.5)",
        duration: 1,
      });

      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      resetTimeoutRef.current = setTimeout(() => {
        if (isInteractingRef.current) {
          setIsInteracting(false);
          isInteractingRef.current = false;
          resetTimeoutRef.current = null;
        }
      }, 1000);
    };

    const onMouseMove = (e: MouseEvent) => moveEvent(e.pageX, e.pageY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        moveEvent(touch.pageX, touch.pageY, e);
      }
    };

    const addListeners = () => {
      path.addEventListener("mousemove", onMouseMove);
      path.addEventListener("mouseleave", leaveEvent);
      path.addEventListener("touchmove", onTouchMove, { passive: false });
      path.addEventListener("touchend", leaveEvent);
      path.addEventListener("touchcancel", leaveEvent);
      window.addEventListener("resize", updateDimensions);
      window.addEventListener("scroll", updateDimensions);
      window.addEventListener("orientationchange", updateDimensions);
    };

    const removeListeners = () => {
      path.removeEventListener("mousemove", onMouseMove);
      path.removeEventListener("mouseleave", leaveEvent);
      path.removeEventListener("touchmove", onTouchMove);
      path.removeEventListener("touchend", leaveEvent);
      path.removeEventListener("touchcancel", leaveEvent);
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("scroll", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
    };

    updateDimensions();
    addListeners();
    return () => removeListeners();
  }, [children]);
  return (
    <div
      ref={elemRef}
      className={`${styles.magneticThingy} ${
        isInteracting ? styles.isInteracting : ""
      } ${className}`}
    >
      {" "}
      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMin meet"
      >
        <path
          ref={pathRef}
          d="M101.5,-1 L202,96.5 L97,201 L-2,100.5 Z"
          fill="transparent"
          style={{ pointerEvents: "fill" }}
        />
      </svg>
      <div className={styles.projectionWrapper} ref={projectionWrapperRef}>
        {children}
      </div>
    </div>
  );
};

export default MagneticThingy;
