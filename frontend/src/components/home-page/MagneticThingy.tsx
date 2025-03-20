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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const hitAreaRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const target = buttonRef.current;
    const hitArea = hitAreaRef.current;
    // if (!target || !hitArea) return;
    if (!target) return;

    let textSpan: HTMLSpanElement | null = null;
    if (magText) {
      textSpan = document.createElement("span");
      textSpan.innerText = target.innerText;
      target.innerHTML = "";
      target.appendChild(textSpan);
      textRef.current = textSpan;
      gsap.set(textSpan, { pointerEvents: "none", display: "block" });
    }

    let { left, top, width, height } = target.getBoundingClientRect();

    const magnetize = (val: number) => {
      const dist = gsap.utils.normalize(0, width, Math.abs(val));
      return gsap.utils.interpolate([1, 0.4, 0], dist);
    };

    const updateDimensions = () => {
      ({ left, top, width, height } = target.getBoundingClientRect());
    };

    const moveEvent = (e: MouseEvent) => {
      const relX = e.pageX - left - width / 2;
      const relY = e.pageY - top - height / 2;
      const moveX = magnetize(relX);
      const moveY = magnetize(relY);

      const xValue = moveX * relX;
      const yValue = moveY * relY;
      const rotation = (relX / width) * 15;

      gsap.to(target, {
        x: xValue,
        y: yValue,
        rotation,
        onUpdate: () => {
          gsap.set(target, { rotation });
        },
      });

      if (magText && textRef.current) {
        gsap.to(textRef.current, {
          x: xValue * 0.3,
          y: yValue * 0.2,
        });
      }
    };

    const leaveEvent = () => {
      gsap.to(target, {
        x: 0,
        y: 0,
        rotation: 0,
        ease: "elastic.out(1, 0.5)",
        duration: 1,
      });

      if (magText && textRef.current) {
        gsap.to(textRef.current, {
          x: 0,
          y: 0,
          ease: "elastic.out(1, 0.5)",
          duration: 1,
        });
      }
    };

    const enterEvent = () => {
      target.addEventListener("mousemove", moveEvent);
      target.addEventListener("mouseleave", leaveEvent);
    };

    target.addEventListener("mouseenter", enterEvent);
    // hitArea.addEventListener("mouseenter", enterEvent);
    window.addEventListener("resize", updateDimensions);

    return () => {
      target.removeEventListener("mouseenter", enterEvent);
      // hitArea.removeEventListener("mouseenter", enterEvent);
      target.removeEventListener("mousemove", moveEvent);
      target.removeEventListener("mouseleave", leaveEvent);
      window.removeEventListener("resize", updateDimensions);
    };
  }, [magText]);

  return (
    // <svg className={styles.svg} width="200" height="200" viewBox="0 0 200 200">
    //   <path
    //     ref={hitAreaRef}
    //     d="M50,10 C100,-10,150,40,170,90 C180,130,120,180,80,190 C30,200,10,140,10,100 C10,60,20,30,50,10"
    //     fill="transparent"
    //     stroke="none"
    //     style={{ pointerEvents: "fill" }}
    //   />
    //   <foreignObject x="25" y="50" width="150" height="100">
    <button ref={buttonRef} className={`${styles.magneticThingy} ${className}`}>
      {children}
    </button>
    //   </foreignObject>
    // </svg>
  );
};

export default MagneticThingy;
