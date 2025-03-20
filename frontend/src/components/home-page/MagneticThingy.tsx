import { useEffect, useRef } from "react";
import gsap from "gsap";

import styles from "./MagneticThingy.module.scss";

type MagneticThingyProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Thingy that magnetically sticks to your pointer.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const MagneticThingy: React.FC<MagneticThingyProps> = ({
  children,
  className = "",
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const projectionWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    const projectionWrapper = projectionWrapperRef.current;
    if (!svg || !path || !projectionWrapper) return;

    let bounds = path.getBoundingClientRect();

    const updateDimensions = () => {
      bounds = path.getBoundingClientRect();
    };

    updateDimensions();

    const magnetize = (val: number, axisSize: number) => {
      const dist = gsap.utils.normalize(0, axisSize / 2, Math.abs(val));
      return gsap.utils.interpolate([1, 0.4, 0], dist);
    };

    const moveEvent = (e: MouseEvent) => {
      const { left, top, width, height } = bounds;

      const adjustedLeft = left + window.scrollX;
      const adjustedTop = top + window.scrollY;

      const relX = e.pageX - adjustedLeft - width / 2;
      const relY = e.pageY - adjustedTop - height / 2;
      const moveX = magnetize(relX, width);
      const moveY = magnetize(relY, height);

      const xValue = moveX * relX * 0.1;
      const yValue = moveY * relY * 0.9;
      const rotation = (relX / width) * 15;

      gsap.to(svg, {
        x: xValue,
        y: yValue,
        rotation,
        transformOrigin: "50% 150%",
        ease: "power2.out",
      });

      gsap.to(projectionWrapper, {
        x: xValue * -0.5,
        y: yValue * 0.2,
        ease: "power2.out",
      });
    };

    const leaveEvent = () => {
      gsap.to(svg, {
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
    };

    path.addEventListener("mousemove", moveEvent);
    path.addEventListener("mouseleave", leaveEvent);
    window.addEventListener("resize", updateDimensions);
    window.addEventListener("scroll", updateDimensions);
    window.addEventListener("orientationchange", updateDimensions);

    return () => {
      path.removeEventListener("mousemove", moveEvent);
      path.removeEventListener("mouseleave", leaveEvent);
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("scroll", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
    };
  }, [children]);

  return (
    <svg
      ref={svgRef}
      className={`${styles.magneticThingy} ${className}`}
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMin meet"
    >
      <path
        ref={pathRef}
        d="M101.5,-1 L202,96.5 L97,201 L-2,100.5 Z"
        fill="transparent"
        style={{ pointerEvents: "fill" }}
      />
      <foreignObject
        x="0"
        y="0"
        width="100%"
        height="100%"
        style={{ pointerEvents: "none" }}
      >
        <div ref={projectionWrapperRef}>{children}</div>
      </foreignObject>
    </svg>
  );
};

export default MagneticThingy;
