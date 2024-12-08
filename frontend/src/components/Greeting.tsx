import React, { useState, useEffect, useRef } from "react";

type FloatingObject = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
};

const FloatingObjectsWithDamping: React.FC = () => {
  const [objects, setObjects] = useState<FloatingObject[]>([
    { id: 1, x: 50, y: 50, vx: 1, vy: 1, isDragging: false },
    { id: 2, x: 150, y: 150, vx: -1, vy: 1, isDragging: false },
  ]);

  const containerRef = useRef<HTMLDivElement>(null);

  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setObjects((prev) =>
        prev.map((obj) => {
          if (obj.isDragging) return obj; // Skip updating dragging objects

          let { x, y, vx, vy } = obj;

          // Get bounds of the container
          const container = containerRef.current;
          if (!container) return obj;
          const bounds = container.getBoundingClientRect();

          // Update position
          x += vx;
          y += vy;

          // Bounce off edges
          if (x <= 0 || x >= bounds.width - 50) vx = -vx;
          if (y <= 0 || y >= bounds.height - 50) vy = -vy;

          // Apply damping
          const dampingFactor = 0.98; // Slows down gradually
          const minSpeed = 0.5; // Minimum speed for natural floating
          vx =
            Math.abs(vx) > minSpeed
              ? vx * dampingFactor
              : Math.sign(vx) * minSpeed;
          vy =
            Math.abs(vy) > minSpeed
              ? vy * dampingFactor
              : Math.sign(vy) * minSpeed;

          return { ...obj, x, y, vx, vy };
        }),
      );
    }, 16); // Roughly 60fps

    return () => clearInterval(interval);
  }, []);

  const handleMouseDown = (id: number, e: React.MouseEvent) => {
    dragStartPosition.current = { x: e.clientX, y: e.clientY };

    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === id ? { ...obj, isDragging: true, vx: 0, vy: 0 } : obj,
      ),
    );
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStartPosition.current) return;

    setObjects((prev) =>
      prev.map((obj) =>
        obj.isDragging
          ? {
              ...obj,
              x: obj.x + (e.movementX || 0),
              y: obj.y + (e.movementY || 0),
            }
          : obj,
      ),
    );
  };

  const handleMouseUp = (id: number, e: MouseEvent) => {
    if (!dragStartPosition.current) return;

    const dragEndPosition = { x: e.clientX, y: e.clientY };
    const deltaX = dragEndPosition.x - dragStartPosition.current.x;
    const deltaY = dragEndPosition.y - dragStartPosition.current.y;

    // Apply velocity based on drag motion
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === id
          ? {
              ...obj,
              vx: deltaX * 0.1, // Scale the velocity
              vy: deltaY * 0.1,
              isDragging: false,
            }
          : obj,
      ),
    );

    dragStartPosition.current = null;
  };

  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      objects.forEach((obj) => {
        if (obj.isDragging) {
          handleMouseUp(obj.id, e);
        }
      });
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleMouseMove(e);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [objects]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "500px",
        // border: "2px solid #ccc",
        overflow: "hidden",
      }}
    >
      {objects.map((obj) => (
        <div
          key={obj.id}
          onMouseDown={(e) => handleMouseDown(obj.id, e)}
          style={{
            position: "absolute",
            left: obj.x,
            top: obj.y,
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            backgroundColor: obj.id === 1 ? "red" : "blue",
            cursor: "pointer",
          }}
        ></div>
      ))}
    </div>
  );
};

export default FloatingObjectsWithDamping;
