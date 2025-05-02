import React, { useRef, useState, useEffect, useCallback } from "react";

import { Side } from "./BorderBlinker";
import styles from "./SlingerBox.module.scss";

type SlingerObject = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
};

type SlingerBoxProps = {
  onDrag?: (x: number, y: number, e: MouseEvent | TouchEvent) => void;
  onDragEnd?: (x: number, y: number, e: MouseEvent | TouchEvent) => void;
  onWallCollision?: (wall: Side, x: number, y: number) => void;
  onIdle?: () => void;
};

/**
 * SlingerBox component
 *
 * Component containing draggable floating objects with simple physics-based movement.
 * Can be thrown and implements a bouncing effect inside a container.
 * Tracks velocity and uses damping for realistic movement.
 * Will eventually be gamified.
 *
 * @component
 * @param {SlingerBoxProps} props - Component props containing optional drag event handlers.
 */
const SlingerBox: React.FC<SlingerBoxProps> = ({
  onDrag,
  onDragEnd,
  onWallCollision,
  onIdle,
}) => {
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

  const lastActivityTimeRef = useRef<number>(performance.now());
  const hasBecomeIdleRef = useRef<boolean>(false);
  const idleSpeedThreshold = 0.8;

  const objectsRef = useRef<SlingerObject[]>([
    { id: 1, x: 50, y: 50, vx: 1, vy: 1, isDragging: false },
  ]);

  const desiredFPS = 40;
  const frameInterval = 1000 / desiredFPS; // e.g., 1000ms / 30fps ≈ 33.33ms
  const lastFrameTime = useRef<number>(performance.now());

  const animate = useCallback(
    (timestamp: number) => {
      if (!containerRef.current) return;

      const bounds = containerRef.current.getBoundingClientRect();

      const elapsed = timestamp - lastFrameTime.current;

      if (elapsed > frameInterval) {
        lastFrameTime.current = timestamp - (elapsed % frameInterval);

        objectsRef.current.forEach((obj) => {
          if (obj.isDragging) return;

          let { x, y, vx, vy } = obj;

          x += vx;
          y += vy;

          // Wall collision and callback handling
          if (x <= 0) {
            x = 0;
            vx = -vx * 0.8;
            onWallCollision?.("left", 0, Math.round(y) + ballSize / 2);
          }

          if (x >= bounds.width - ballSize) {
            x = bounds.width - ballSize;
            vx = -vx * 0.8;
            onWallCollision?.(
              "right",
              bounds.width,
              Math.round(y) + ballSize / 2,
            );
          }

          if (y <= 0) {
            y = 0;
            vy = -vy * 0.8;
            onWallCollision?.("top", Math.round(x) + ballSize / 2, 0);
          }

          if (y >= bounds.height - ballSize) {
            y = bounds.height - ballSize;
            vy = -vy * 0.8;
            onWallCollision?.(
              "bottom",
              Math.round(x) + ballSize / 2,
              bounds.height,
            );
          }

          // Apply damping
          const dampingFactor = 0.98;
          const minSpeed = 0.5;
          vx =
            Math.abs(vx) > minSpeed
              ? vx * dampingFactor
              : Math.sign(vx) * minSpeed;
          vy =
            Math.abs(vy) > minSpeed
              ? vy * dampingFactor
              : Math.sign(vy) * minSpeed;

          obj.x = x;
          obj.y = y;
          obj.vx = vx;
          obj.vy = vy;

          // IDLE CHECK
          const speed = Math.sqrt(vx * vx + vy * vy);
          const now = performance.now();

          if (speed < idleSpeedThreshold && !obj.isDragging) {
            if (!hasBecomeIdleRef.current) {
              hasBecomeIdleRef.current = true;
              onIdle?.();
            }
          } else {
            lastActivityTimeRef.current = now;
            hasBecomeIdleRef.current = false;
          }
        });

        const el = document.querySelector(`.slinger`) as HTMLElement | null;
        if (el) {
          el.style.transform = `translate(${Math.round(objectsRef.current[0].x)}px, ${Math.round(objectsRef.current[0].y)}px)`;
          if (hasBecomeIdleRef.current) {
            el.classList.add(styles.idle);
          } else {
            el.classList.remove(styles.idle);
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [onWallCollision, onIdle],
  );

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

    hasBecomeIdleRef.current = false;
    lastActivityTimeRef.current = performance.now();
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
    hasBecomeIdleRef.current = false;
    lastActivityTimeRef.current = performance.now();
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
    <div ref={containerRef} className={styles.slingerWrapper}>
      {objectsRef.current.map((obj) => (
        <div
          className={`${styles.slinger} slinger`}
          key={obj.id}
          onMouseDown={(e) => handleMouseDown(obj.id, e)}
          onTouchStart={(e) => handleTouchStart(obj.id, e)}
        />
      ))}
    </div>
  );
};

export default SlingerBox;
