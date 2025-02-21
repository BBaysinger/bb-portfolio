import React, { useRef, useState, useEffect, useCallback } from "react";
import styles from "./SlingyBall.module.scss";

type FloatingObject = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
};

const SlingyBall: React.FC = () => {
  const objectsRef = useRef<FloatingObject[]>([
    { id: 1, x: 50, y: 50, vx: 1, vy: 1, isDragging: false },
  ]);

  const containerRef = useRef<HTMLDivElement>(null);
  const containerBounds = useRef<{ width: number; height: number } | null>(
    null,
  );
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const triggerRender = useState(0)[1]; // Dummy state to force re-renders

  useEffect(() => {
    if (containerRef.current) {
      containerBounds.current = containerRef.current.getBoundingClientRect();
    }

    const handleResize = () => {
      if (containerRef.current) {
        containerBounds.current = containerRef.current.getBoundingClientRect();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const animate = useCallback(() => {
    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) return;

      let { x, y, vx, vy } = obj;
      const bounds = containerBounds.current;
      if (!bounds) return;

      x += vx;
      y += vy;

      if (x <= 0 || x >= bounds.width - 50) vx = -vx;
      if (y <= 0 || y >= bounds.height - 50) vy = -vy;

      const dampingFactor = 0.98;
      const minSpeed = 0.5;
      vx =
        Math.abs(vx) > minSpeed ? vx * dampingFactor : Math.sign(vx) * minSpeed;
      vy =
        Math.abs(vy) > minSpeed ? vy * dampingFactor : Math.sign(vy) * minSpeed;

      obj.x = x;
      obj.y = y;
      obj.vx = vx;
      obj.vy = vy;
    });

    triggerRender((prev) => prev + 1); // Force a re-render
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [animate]);

  const handleMouseDown = (id: number, e: React.MouseEvent) => {
    dragStartPosition.current = { x: e.clientX, y: e.clientY };

    objectsRef.current.forEach((obj) => {
      if (obj.id === id) {
        obj.isDragging = true;
        obj.vx = 0;
        obj.vy = 0;
      }
    });

    triggerRender((prev) => prev + 1); // Force a re-render
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartPosition.current) return;

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) {
        obj.x += e.movementX;
        obj.y += e.movementY;
      }
    });

    triggerRender((prev) => prev + 1); // Force a re-render
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragStartPosition.current) return;

    const { x: startX, y: startY } = dragStartPosition.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) {
        obj.vx = deltaX * 0.1;
        obj.vy = deltaY * 0.1;
        obj.isDragging = false;
      }
    });

    dragStartPosition.current = null;
    triggerRender((prev) => prev + 1); // Force a re-render
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className={styles["slingy-ball-container"]}>
      {objectsRef.current.map((obj) => (
        <div
          className={styles["slingy-ball"]}
          key={obj.id}
          onMouseDown={(e) => handleMouseDown(obj.id, e)}
          style={{ transform: `translate(${obj.x}px, ${obj.y}px)` }}
        />
      ))}
    </div>
  );
};

export default SlingyBall;
