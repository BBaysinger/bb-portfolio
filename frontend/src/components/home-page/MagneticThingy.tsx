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

    let { left, top, width, height } = path.getBoundingClientRect();

    const magnetize = (val: number) => {
      const dist = gsap.utils.normalize(0, width, Math.abs(val));
      return gsap.utils.interpolate([1, 0.4, 0], dist);
    };

    const updateDimensions = () => {
      ({ left, top, width, height } = path.getBoundingClientRect());
    };

    const moveEvent = (e: MouseEvent) => {
      const relX = e.pageX - left - width / 2;
      const relY = e.pageY - top - height / 2;
      const moveX = magnetize(relX);
      const moveY = magnetize(relY);

      const xValue = moveX * relX;
      const yValue = moveY * relY;
      const rotation = (relX / width) * 15;

      gsap.to(svg, {
        x: xValue,
        y: yValue,
        rotation,
        transformOrigin: "50% 100%",
        onUpdate: () => {
          gsap.set(svg, { rotation });
        },
      });

      if (projectionWrapper) {
        gsap.to(projectionWrapper, {
          x: xValue * 0.3,
          y: yValue * 0.2,
          ease: "power2.out",
        });
      }
    };

    const leaveEvent = () => {
      gsap.to(svg, {
        x: 0,
        y: 0,
        rotation: 0,
        ease: "elastic.out(1, 0.5)",
        duration: 1,
      });

      if (projectionWrapper) {
        gsap.to(projectionWrapper, {
          x: 0,
          y: 0,
          ease: "elastic.out(1, 0.5)",
          duration: 1,
        });
      }
    };

    path.addEventListener("mousemove", moveEvent);
    path.addEventListener("mouseleave", leaveEvent);
    window.addEventListener("resize", updateDimensions);
    window.addEventListener("orientationchange", updateDimensions);

    return () => {
      path.removeEventListener("mousemove", moveEvent);
      path.removeEventListener("mouseleave", leaveEvent);
      window.removeEventListener("resize", updateDimensions);
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
