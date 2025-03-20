import { useEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./MagneticThingy.module.scss";

type MagneticThingyProps = {
  children: React.ReactNode;
  magText?: boolean;
  className?: string;
};

const MagneticThingy: React.FC<MagneticThingyProps> = ({
  children,
  magText = false,
  className = "",
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    const button = buttonRef.current;
    const text = textRef.current;
    if (!svg || !path || !button || !text) return;

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
        onUpdate: () => {
          gsap.set(svg, { rotation });
        },
      });

      if (magText && text) {
        gsap.to(text, {
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

      if (magText && text) {
        gsap.to(text, {
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

    return () => {
      path.removeEventListener("mousemove", moveEvent);
      path.removeEventListener("mouseleave", leaveEvent);
      window.removeEventListener("resize", updateDimensions);
    };
  }, [magText, children]);

  return (
    <svg
      ref={svgRef}
      className={`${styles.magneticThingy} ${className}`}
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMin meet" // 🔥 Pins the content to the TOP of the SVG
    >
      <path
        ref={pathRef}
        d="M100,0 L180,80 L100,150 L20,80 Z"
        fill="blue"
        stroke="blue"
        strokeWidth="3"
        style={{ pointerEvents: "fill" }} // Ensures mouse events work
      />
      <foreignObject x="25" y="5000" width="150" height="100">
        <div
          style={{
            width: "200px",
            height: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button ref={buttonRef}>
            <span ref={textRef} style={{ display: "inline-block" }}>
              {children}
            </span>
          </button>
        </div>
      </foreignObject>
    </svg>
  );
};

export default MagneticThingy;
