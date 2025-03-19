import { useState, useEffect, useRef } from "react";

const MagneticMeter = () => {
  const [pointerX, setPointerX] = useState(150);
  const [pointerY, setPointerY] = useState(50);
  const [needleAngle, setNeedleAngle] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [stuckPosition, setStuckPosition] = useState({ x: 0, y: 0 });

  const needleRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Constants for physics
  const STICK_THRESHOLD = 10; // Distance where the needle sticks
  const BREAK_FORCE = 30; // Distance required to unstick
  const SPRING_CONSTANT = 0.1; // Attraction strength
  const DAMPING = 0.9; // Damping to slow movement

  useEffect(() => {
    const updatePhysics = () => {
      const needle = needleRef.current;
      if (!needle) return;

      const rect = needle.getBoundingClientRect();
      const needleX = rect.left + rect.width / 2;
      const needleY = rect.top + rect.height / 2;

      const dx = pointerX - needleX;
      const dy = pointerY - needleY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      if (stuck) {
        // Check if the pointer moves far enough to break free
        const breakDistance = Math.sqrt(
          (pointerX - stuckPosition.x) ** 2 + (pointerY - stuckPosition.y) ** 2,
        );
        if (breakDistance > BREAK_FORCE) {
          setStuck(false);
        } else {
          setNeedleAngle(angle);
        }
      } else {
        if (distance < STICK_THRESHOLD) {
          setStuck(true);
          setStuckPosition({ x: pointerX, y: pointerY });
          setNeedleAngle(angle);
        } else {
          // Apply magnetic attraction force
          const force = SPRING_CONSTANT * (angle - needleAngle);
          const newAngle = needleAngle + force;
          setNeedleAngle(newAngle * DAMPING);
        }
      }

      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [pointerX, pointerY, needleAngle, stuck, stuckPosition]);

  return (
    <div
      onMouseMove={(e) => {
        setPointerX(e.clientX);
        setPointerY(e.clientY);
      }}
      style={{
        position: "relative",
        width: "300px",
        height: "300px",
        border: "1px solid black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Needle */}
      <div
        ref={needleRef}
        style={{
          width: "4px",
          height: "100px",
          background: "red",
          position: "absolute",
          transformOrigin: "bottom center",
          transform: `rotate(${needleAngle}deg)`,
          transition: stuck ? "none" : "transform 0.1s ease-out",
        }}
      />
      {/* Pointer */}
      <div
        style={{
          width: "10px",
          height: "10px",
          background: "blue",
          position: "absolute",
          left: pointerX - 5,
          top: pointerY - 5,
          borderRadius: "50%",
        }}
      />
    </div>
  );
};

export default MagneticMeter;
