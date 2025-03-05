import React, { useRef, useState, useEffect, useCallback } from "react";

import styles from "./Slinger.module.scss";

type FloatingObject = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
};

type SlingerProps = {
  onDrag?: (x: number, y: number, e: MouseEvent | TouchEvent) => void;
  onDragEnd?: (x: number, y: number, e: MouseEvent | TouchEvent) => void;
};

const Slinger: React.FC<SlingerProps> = ({ onDrag, onDragEnd }) => {
  const ballSize = 50;
  const animationFrameRef = useRef<number | null>(null);
  const triggerRender = useState(0)[1];
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const movementHistory = useRef<{ x: number; y: number; time: number }[]>([]);
  const lastKnownVelocity = useRef<{ vx: number; vy: number }>({
    vx: 0,
    vy: 0,
  });
  const objectsRef = useRef<FloatingObject[]>([
    { id: 1, x: 50, y: 50, vx: 1, vy: 1, isDragging: false },
  ]);

  const animate = useCallback(() => {
    if (!containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) return;

      let { x, y, vx, vy } = obj;

      x += vx;
      y += vy;

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

  const startDrag = (
    id: number,
    clientX: number,
    clientY: number,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    if (
      !(e.target instanceof HTMLElement) ||
      !e.target.classList.contains(styles["obj"])
    ) {
      return false; // Ensure the event started on a ball
    }

    dragStartPosition.current = { x: clientX, y: clientY };
    movementHistory.current = [
      { x: clientX, y: clientY, time: performance.now() },
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

    // if (e.cancelable) {
    //   e.preventDefault();
    // }
  };

  const handleMouseDown = (id: number, e: React.MouseEvent) => {
    startDrag(id, e.clientX, e.clientY, e);
  };

  const handleTouchStart = (id: number, e: React.TouchEvent) => {
    const touch = e.touches[0];
    startDrag(id, touch.clientX, touch.clientY, e);
  };

  const handleMove = (
    clientX: number,
    clientY: number,
    e: MouseEvent | TouchEvent,
  ) => {
    if (!dragStartPosition.current) return;

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) {
        obj.x += clientX - dragStartPosition.current!.x;
        obj.y += clientY - dragStartPosition.current!.y;
        dragStartPosition.current = { x: clientX, y: clientY };

        // Invoke onDrag callback
        onDrag?.(clientX + ballSize / 2, clientY + ballSize / 2, e);
      }
    });

    // Track recent movement (keep only last 100ms worth of data)
    const now = performance.now();
    movementHistory.current.push({ x: clientX, y: clientY, time: now });

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
    e.preventDefault();
  };

  const endDrag = (e: MouseEvent | TouchEvent) => {
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

        // Invoke onDragEnd callback
        onDragEnd?.(vx + ballSize / 2, vy + ballSize / 2, e);
      }
    });

    dragStartPosition.current = null;
    movementHistory.current = [];
    triggerRender((prev) => prev + 1);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) =>
      handleMove(e.clientX, e.clientY, e);
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY, e);
    };

    const handleMouseUp = (e: MouseEvent) => endDrag(e);
    const handleTouchEnd = (e: TouchEvent) => endDrag(e);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef} className={styles["wrapper"]}>
      {objectsRef.current.map((obj) => {
        const isIdle =
          !obj.isDragging && Math.abs(obj.vx) <= 0.5 && Math.abs(obj.vy) <= 0.5;
        return (
          <div
            className={
              `${styles["obj"]} ${isIdle ? styles["idle"] : ""} ` +
              `slinger-obj ${isIdle ? "slinger-idle" : ""}`
            }
            key={obj.id}
            onMouseDown={(e) => handleMouseDown(obj.id, e)}
            onTouchStart={(e) => handleTouchStart(obj.id, e)}
            style={{
              transform: `translate(${Math.round(obj.x)}px, ${Math.round(obj.y)}px)`,
            }}
          ></div>
        );
      })}
    </div>
  );
};

export default Slinger;
