import React, { useRef, useEffect, useState } from "react";

const NeedleAttraction: React.FC = () => {
  const anchor = { x: 200, y: 200 }; // Fixed rotation point
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const updateNeedleRotation = (e: MouseEvent) => {
      const pointerX = e.clientX;
      const pointerY = e.clientY;

      // Calculate angle between the anchor and the pointer
      const deltaX = pointerX - anchor.x;
      const deltaY = pointerY - anchor.y;
      const targetAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      // Calculate distance and normalize attraction strength
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
      const maxDistance = 300; // Beyond this distance, movement is negligible
      const attractionStrength = Math.max(0, 1 - distance / maxDistance); // Closer -> stronger pull, farther -> weaker

      // Apply smooth interpolation with decreasing attraction
      setAngle(
        (prevAngle) =>
          prevAngle + (targetAngle - prevAngle) * attractionStrength * 0.1,
      );
    };

    window.addEventListener("mousemove", updateNeedleRotation);
    return () => window.removeEventListener("mousemove", updateNeedleRotation);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: `${anchor.x}px`,
        top: `${anchor.y}px`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: "0% 50%", // Fixed at one end
        width: "100px",
        height: "4px",
        backgroundColor: "red",
        transition: "transform 0.05s linear",
      }}
    />
  );
};

export default NeedleAttraction;
