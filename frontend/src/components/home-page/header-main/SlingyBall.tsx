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
  const movementHistory = useRef<{ x: number; y: number; time: number }[]>([]);
  const lastKnownVelocity = useRef<{ vx: number; vy: number }>({
    vx: 0,
    vy: 0,
  });

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

      // Keep within bounds
      const ballSize = 50;
      if (x < 0) {
        x = 0;
        vx = -vx * 0.8;
      }
      if (x > bounds.width - ballSize) {
        x = bounds.width - ballSize;
        vx = -vx * 0.8;
      }
      if (y < 0) {
        y = 0;
        vy = -vy * 0.8;
      }
      if (y > bounds.height - ballSize) {
        y = bounds.height - ballSize;
        vy = -vy * 0.8;
      }

      // Apply damping
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

    triggerRender((prev) => prev + 1); // Force re-render
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
    movementHistory.current = [
      { x: e.clientX, y: e.clientY, time: performance.now() },
    ];
    lastKnownVelocity.current = { vx: 0, vy: 0 };

    objectsRef.current.forEach((obj) => {
      if (obj.id === id) {
        obj.isDragging = true;
        obj.vx = 0;
        obj.vy = 0;
      }
    });

    triggerRender((prev) => prev + 1);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartPosition.current) return;

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) {
        obj.x += e.movementX;
        obj.y += e.movementY;
      }
    });

    // Track recent movement (keep only last 100ms worth of data)
    const now = performance.now();
    movementHistory.current.push({ x: e.clientX, y: e.clientY, time: now });

    // Remove old entries (more than 100ms old)
    movementHistory.current = movementHistory.current.filter(
      (entry) => now - entry.time <= 100,
    );

    // Calculate latest velocity if movement happened
    if (movementHistory.current.length > 1) {
      const first = movementHistory.current[0];
      const last = movementHistory.current[movementHistory.current.length - 1];

      const elapsedTime = (last.time - first.time) / 1000; // Convert to seconds
      if (elapsedTime > 0) {
        lastKnownVelocity.current.vx = ((last.x - first.x) / elapsedTime) * 0.1;
        lastKnownVelocity.current.vy = ((last.y - first.y) / elapsedTime) * 0.1;
      }
    }

    triggerRender((prev) => prev + 1);
  }, []);

  const handleMouseUp = useCallback((_e: MouseEvent) => {
    if (!dragStartPosition.current) return;

    let vx = lastKnownVelocity.current.vx;
    let vy = lastKnownVelocity.current.vy;

    // If no movement was detected, set a small release velocity
    const minVelocity = 0.5;
    if (Math.abs(vx) < minVelocity && Math.abs(vy) < minVelocity) {
      vx = Math.sign(vx) * minVelocity || minVelocity;
      vy = Math.sign(vy) * minVelocity || minVelocity;
    }

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) {
        obj.vx = vx;
        obj.vy = vy;
        obj.isDragging = false;
      }
    });

    dragStartPosition.current = null;
    movementHistory.current = [];
    triggerRender((prev) => prev + 1);
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
          style={{
            transform: `translate(${Math.round(obj.x)}px, ${Math.round(obj.y)}px)`,
          }}
        ></div>
      ))}
    </div>
  );
};

export default SlingyBall;
