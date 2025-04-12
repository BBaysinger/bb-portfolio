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
  onWallCollision?: (
    wall: "left" | "right" | "top" | "bottom",
    x: number,
    y: number,
  ) => void;
};

/**
 * Slinger component - A draggable floating object with physics-based movement.
 * Implements a bouncing effect inside a container and tracks velocity upon release.
 *
 * @component
 * @param {SlingerProps} props - Component props containing optional drag event handlers.
 */
const Slinger: React.FC<SlingerProps> = ({
  onDrag,
  onDragEnd,
  onWallCollision,
}) => {
  const ballSize = 50;
  const animationFrameRef = useRef<number | null>(null);
  const triggerRender = useState(0)[1]; // Used to force re-render when necessary
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

  /** Animate floating object */
  const animate = useCallback(() => {
    if (!containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) return;

      let { x, y, vx, vy } = obj;
      let collidedWall: null | "left" | "right" | "top" | "bottom" = null;

      x += vx;
      y += vy;

      if (x < 0) {
        x = 0;
        vx = -vx * 0.8;
        collidedWall = "left";
      }
      if (x > bounds.width - ballSize) {
        x = bounds.width - ballSize;
        vx = -vx * 0.8;
        collidedWall = "right";
      }
      if (y < 0) {
        y = 0;
        vy = -vy * 0.8;
        collidedWall = "top";
      }
      if (y > bounds.height - ballSize) {
        y = bounds.height - ballSize;
        vy = -vy * 0.8;
        collidedWall = "bottom";
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

      // Trigger collision callback if one occurred
      if (collidedWall && typeof onWallCollision === "function") {
        const centerX = x + ballSize / 2;
        const centerY = y + ballSize / 2;
        onWallCollision(collidedWall, centerX, centerY);
      }
    });

    const el = document.querySelector(`.slinger-obj`) as HTMLElement | null;
    if (el) {
      el.style.transform = `translate(${Math.round(objectsRef.current[0].x)}px, ${Math.round(objectsRef.current[0].y)}px)`;
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [onWallCollision]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [animate]);

  /** Start dragging */
  const startDrag = (
    id: number,
    clientX: number,
    clientY: number,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    if (
      !(e.target instanceof HTMLElement) ||
      !e.target.classList.contains(styles.slinger)
    )
      return;

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
  };

  const handleMouseDown = (id: number, e: React.MouseEvent) => {
    startDrag(id, e.clientX, e.clientY, e);
  };

  const handleTouchStart = (id: number, e: React.TouchEvent) => {
    const touch = e.touches[0];
    startDrag(id, touch.clientX, touch.clientY, e);
  };

  /** Handle dragging movement */
  const handleMove = (
    clientX: number,
    clientY: number,
    e: MouseEvent | TouchEvent,
  ) => {
    if (!dragStartPosition.current) return;

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging && dragStartPosition.current) {
        obj.x += clientX - dragStartPosition.current.x;
        obj.y += clientY - dragStartPosition.current.y;
        dragStartPosition.current = { x: clientX, y: clientY };

        onDrag?.(clientX, clientY, e);
      }
    });

    // Track velocity history for smooth release
    const now = performance.now();
    movementHistory.current.push({ x: clientX, y: clientY, time: now });

    movementHistory.current = movementHistory.current.filter(
      (entry) => now - entry.time <= 100,
    );

    // Calculate velocity
    if (movementHistory.current.length > 1) {
      const first = movementHistory.current[0];
      const last = movementHistory.current[movementHistory.current.length - 1];

      const elapsedTime = (last.time - first.time) / 1000;
      if (elapsedTime > 0) {
        lastKnownVelocity.current.vx = ((last.x - first.x) / elapsedTime) * 0.1;
        lastKnownVelocity.current.vy = ((last.y - first.y) / elapsedTime) * 0.1;
      }
    }

    // triggerRender((prev) => prev + 1); // Removed for performance
    e.preventDefault();
  };

  /** End drag event */
  const endDrag = (e: MouseEvent | TouchEvent) => {
    if (!dragStartPosition.current) return;

    objectsRef.current.forEach((obj) => {
      if (obj.isDragging) {
        obj.vx = lastKnownVelocity.current.vx;
        obj.vy = lastKnownVelocity.current.vy;
        obj.isDragging = false;

        onDragEnd?.(obj.vx, obj.vy, e);
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
    <div ref={containerRef} className={styles.wrapper}>
      {objectsRef.current.map((obj) => (
        <div
          className={`${styles.slinger} slinger-obj`}
          key={obj.id}
          onMouseDown={(e) => handleMouseDown(obj.id, e)}
          onTouchStart={(e) => handleTouchStart(obj.id, e)}
        />
      ))}
    </div>
  );
};

export default Slinger;
