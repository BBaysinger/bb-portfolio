import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

import styles from "./MagneticThingy.module.scss";

type MagneticThingyProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Interactive magnetic element that follows pointer movement
 *
 * A sophisticated interactive component that creates a magnetic attraction effect
 * between the user's pointer and the wrapped content. Features gentle waving
 * animations to attract attention, then smoothly follows mouse/touch movement
 * with physics-based easing and rotation effects.
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to wrap with magnetic behavior
 * @param {string} [props.className=""] - Additional CSS classes to apply
 *
 * @example
 * ```tsx
 * <MagneticThingy className="hello-sign">
 *   <img src="/hello.png" alt="Hello" />
 * </MagneticThingy>
 * ```
 *
 * Features:
 * - Gentle CSS waving animation when idle to attract attention
 * - Smooth GSAP-powered magnetic following on hover/touch
 * - Physics-based movement with elastic return animations
 * - Optimized with requestAnimationFrame and debouncing
 * - Touch and mouse support with proper event handling
 * - Automatic return to neutral position when interaction ends
 *
 * Technical Details:
 * - Uses invisible SVG hit area for precise interaction boundaries
 * - Magnetism strength decreases with distance from center
 * - Includes subtle rotation based on horizontal offset
 * - Projection wrapper creates depth illusion with offset movement
 * - Interaction state managed to pause idle animations
 *
 * Performance:
 * - RAF-throttled movement calculations
 * - GSAP overwrite protection prevents animation conflicts
 * - Lazy evaluation for smooth 60fps interactions
 *
 * @requires gsap GSAP animation library for smooth transitions
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

  useEffect(() => {
    let ticking = false;
    let latestX = 0;
    let latestY = 0;

    const loop = () => {
      ticking = false;
      moveEvent(latestX, latestY);
    };
    const elem = elemRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const projectionWrapper = projectionWrapperRef.current;
    if (!elem || !svg || !path || !projectionWrapper) return;

    const magnetize = (val: number, axisSize: number) => {
      const dist = gsap.utils.normalize(0, axisSize / 2, Math.abs(val));
      return gsap.utils.interpolate([1, 0.4, 0], dist);
    };

    const pauseWave = () => {
      if (!isInteractingRef.current) {
        isInteractingRef.current = true;
        setIsInteracting(true); // trigger CSS animation pause
      } else {
        // Optional optimization: reset timeout each time
        if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
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

      if (!elementUnderPointer) return;
      if (!path.contains(elementUnderPointer)) {
        leaveEvent();
        return;
      }

      e?.preventDefault();

      const { left, top, width, height } = path.getBoundingClientRect();
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
        x: Math.round(xValue),
        y: Math.round(yValue),
        rotation,
        ease: "power2.out",
        overwrite: "auto",
        lazy: false,
      });
      gsap.to(projectionWrapper, {
        x: Math.round(xValue * -0.5),
        y: Math.round(yValue * 0.2),
        ease: "power2.out",
        overwrite: "auto",
        lazy: false,
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

    const onMouseMove = (e: MouseEvent) => {
      latestX = e.pageX;
      latestY = e.pageY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(loop);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        latestX = e.touches[0].pageX;
        latestY = e.touches[0].pageY;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(loop);
        }
      }
    };

    const addListeners = () => {
      path.addEventListener("mousemove", onMouseMove);
      path.addEventListener("mouseleave", leaveEvent);
      path.addEventListener("touchmove", onTouchMove, { passive: false });
      path.addEventListener("touchend", leaveEvent);
      path.addEventListener("touchcancel", leaveEvent);
    };

    const removeListeners = () => {
      path.removeEventListener("mousemove", onMouseMove);
      path.removeEventListener("mouseleave", leaveEvent);
      path.removeEventListener("touchmove", onTouchMove);
      path.removeEventListener("touchend", leaveEvent);
      path.removeEventListener("touchcancel", leaveEvent);
    };

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
