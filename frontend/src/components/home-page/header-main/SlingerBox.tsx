import clsx from "clsx";
import React, {
  useRef,
  useEffect,
  useCallback,
  useReducer,
  useImperativeHandle,
} from "react";

import MiscUtils from "@/utils/MiscUtils";

import { Side } from "./BorderBlinker";
import styles from "./SlingerBox.module.scss";

const getEventTime = (timeStamp?: number) =>
  typeof timeStamp === "number" && !Number.isNaN(timeStamp)
    ? timeStamp
    : Date.now();

type SlingerObject = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging: boolean;
};

type SlingerBoxProps = {
  onDragStart?: (x: number, y: number, e: MouseEvent | TouchEvent) => void;
  onDragEnd?: (x: number, y: number, e: MouseEvent | TouchEvent) => void;
  onWallCollision?: (wall: Side, x: number, y: number) => void;
  onIdle?: () => void;
  children?: React.ReactNode;
  pointerGravity?: number;
  ballSize?: number;
};

export interface SlingerBoxHandle {
  getSlingerPosition: (id?: number) => { x: number; y: number } | null;
}

/**
 * SlingerBox Component
 *
 * Component containing draggable floating objects (slingers) with simple physics-based movement.
 * Can be thrown and implements a bouncing effect inside a container.
 * Tracks velocity and uses damping for realistic movement.
 * Eventually to be more gamified for fluxel grid and other projects.
 *
 * @component
 * @param {SlingerBoxProps} props - Component props containing optional drag event handlers.
 */
const SlingerBox = React.forwardRef<SlingerBoxHandle, SlingerBoxProps>(
  (
    {
      onDragStart,
      onDragEnd,
      onWallCollision,
      onIdle,
      children,
      pointerGravity = 1,
      ballSize = 50,
    },
    ref,
  ) => {
    // vars
    const radius = ballSize / 2;
    const idleSpeedThreshold = 0.75;
    const desiredFPS = 60;
    const frameInterval = 1000 / desiredFPS;
    const [, forceUpdate] = useReducer((x) => x + 1, 0);
    const childArray = React.Children.toArray(children);
    const gravityRange = 300;

    // state
    const [isReady, setIsReady] = React.useState(false);

    // refs
    const animationFrameRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastActivityTimeRef = useRef<number>(0);
    const hasBecomeIdleRef = useRef<boolean>(false);
    const slingerRefs = useRef<Map<number, HTMLElement>>(new Map());
    const lastDragEndTime = useRef<number>(0);
    const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
    const movementHistory = useRef<{ x: number; y: number; time: number }[]>(
      [],
    );
    const pointerPosition = useRef<{ x: number; y: number } | null>(null);
    const lastFrameTime = useRef<number>(0);
    const objectsRef = useRef<SlingerObject[]>([]);
    const lastKnownVelocity = useRef<{ vx: number; vy: number }>({
      vx: 0,
      vy: 0,
    });

    const clearPointer = () => {
      pointerPosition.current = null;
    };

    const animate = useCallback(
      function step(timestamp: number) {
        if (!containerRef.current) return;

        if (lastFrameTime.current === 0) {
          lastFrameTime.current = timestamp;
        }

        const bounds = containerRef.current.getBoundingClientRect();
        const elapsed = timestamp - lastFrameTime.current;

        if (elapsed > frameInterval) {
          lastFrameTime.current = timestamp - (elapsed % frameInterval);

          const frameTime = timestamp;

          objectsRef.current.forEach((obj) => {
            if (obj.isDragging) return;

            let { x, y, vx, vy } = obj;

            // Pointer gravity effect
            const gravityEnabled =
              pointerGravity > 0 &&
              pointerPosition.current &&
              frameTime - lastDragEndTime.current > 500; // <-- skip gravity for 500ms

            if (gravityEnabled && pointerPosition.current) {
              const pointerX = pointerPosition.current.x;
              const pointerY = pointerPosition.current.y;

              const dx = pointerX - (bounds.left + x);
              const dy = pointerY - (bounds.top + y);
              const distance = Math.hypot(dx, dy);

              if (distance < gravityRange && distance > 1) {
                const closeEnough = 8;
                if (distance < closeEnough) {
                  vx = 0;
                  vy = 0;
                } else {
                  const t = 1 - distance / gravityRange;
                  const gravityPull =
                    pointerGravity * MiscUtils.smoothStep(0, 1, t);
                  const nx = dx / distance;
                  const ny = dy / distance;

                  vx += nx * gravityPull;
                  vy += ny * gravityPull;

                  const dot = vx * nx + vy * ny;
                  const radialVx = dot * nx;
                  const radialVy = dot * ny;
                  const tangentialVx = vx - radialVx;
                  const tangentialVy = vy - radialVy;

                  const orbitDamping = 0.85;
                  vx = radialVx + tangentialVx * orbitDamping;
                  vy = radialVy + tangentialVy * orbitDamping;
                }
              }
            }

            x += vx;
            y += vy;

            // Wall collision
            if (x - radius <= 0) {
              x = radius;
              vx = -vx * 0.8;
              onWallCollision?.("left", 0, Math.round(y));
            }
            if (x + radius >= bounds.width) {
              x = bounds.width - radius;
              vx = -vx * 0.8;
              onWallCollision?.("right", bounds.width, Math.round(y));
            }
            if (y - radius <= 0) {
              y = radius;
              vy = -vy * 0.8;
              onWallCollision?.("top", Math.round(x), 0);
            }
            if (y + radius >= bounds.height) {
              y = bounds.height - radius;
              vy = -vy * 0.8;
              onWallCollision?.("bottom", Math.round(x), bounds.height);
            }

            // Damping
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

            // Write back
            obj.x = x;
            obj.y = y;
            obj.vx = vx;
            obj.vy = vy;

            // Idle detection
            const speed = Math.hypot(vx, vy);
            if (speed < idleSpeedThreshold && !obj.isDragging) {
              if (!hasBecomeIdleRef.current) {
                hasBecomeIdleRef.current = true;
                onIdle?.();
              }
            } else {
              lastActivityTimeRef.current = frameTime;
              hasBecomeIdleRef.current = false;
            }

            // DOM update via ref
            const el = slingerRefs.current.get(obj.id);
            if (el) {
              el.style.transform = `translate(${Math.round(x - radius)}px, ${Math.round(y - radius)}px)`;
              if (hasBecomeIdleRef.current) {
                el.classList.add(styles.idle);
              } else {
                el.classList.remove(styles.idle);
              }
            }
          });
        }

        animationFrameRef.current = requestAnimationFrame(step);
      },
      [onWallCollision, onIdle, pointerGravity, frameInterval, radius],
    );

    useEffect(() => {
      if (objectsRef.current.length === 0) {
        objectsRef.current = childArray.map((_, i) => ({
          id: i,
          x: 0.2 * window.innerWidth + i * 60,
          y: 0.3 * window.innerHeight,
          vx: 1 + Math.random(),
          vy: 1 + Math.random(),
          isDragging: false,
        }));
        setIsReady(true);
      }
    }, [childArray]);

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
        !e.target.classList.contains("slinger")
      )
        return;

      const eventTime = getEventTime(e.nativeEvent.timeStamp);
      dragStartPosition.current = { x: clientX, y: clientY };
      movementHistory.current = [{ x: clientX, y: clientY, time: eventTime }];
      lastKnownVelocity.current = { vx: 0, vy: 0 };

      objectsRef.current.forEach((obj) => {
        if (obj.id === id) {
          obj.isDragging = true;
          obj.vx = 0;
          obj.vy = 0;
        }
      });

      hasBecomeIdleRef.current = false;
      lastActivityTimeRef.current = eventTime;
      forceUpdate();
      onDragStart?.(clientX, clientY, e.nativeEvent);
    };

    const handleMouseDown = (id: number, e: React.MouseEvent) => {
      startDrag(id, e.clientX, e.clientY, e);
    };

    const handleTouchStart = (id: number, e: React.TouchEvent) => {
      const touch = e.touches[0];
      startDrag(id, touch.clientX, touch.clientY, e);
    };

    /** Handle dragging movement */
    const handleMove = useCallback(
      (clientX: number, clientY: number, e: MouseEvent | TouchEvent) => {
        if (!dragStartPosition.current) return;

        objectsRef.current.forEach((obj) => {
          if (obj.isDragging && dragStartPosition.current) {
            obj.x += clientX - dragStartPosition.current.x;
            obj.y += clientY - dragStartPosition.current.y;
            dragStartPosition.current = { x: clientX, y: clientY };

            const el = slingerRefs.current.get(obj.id);
            if (el) {
              el.style.transform = `translate(${Math.round(
                obj.x - radius,
              )}px, ${Math.round(obj.y - radius)}px)`;
            }
          }
        });

        const eventTime = getEventTime(e.timeStamp);
        movementHistory.current.push({
          x: clientX,
          y: clientY,
          time: eventTime,
        });
        movementHistory.current = movementHistory.current.filter(
          (entry) => eventTime - entry.time <= 100,
        );

        if (movementHistory.current.length > 1) {
          const first = movementHistory.current[0];
          const last =
            movementHistory.current[movementHistory.current.length - 1];
          const elapsedTime = (last.time - first.time) / 1000;
          if (elapsedTime > 0) {
            lastKnownVelocity.current.vx =
              ((last.x - first.x) / elapsedTime) * 0.1;
            lastKnownVelocity.current.vy =
              ((last.y - first.y) / elapsedTime) * 0.1;
          }
        }

        e.preventDefault();
      },
      [radius],
    );

    const endDrag = useCallback(
      (e: MouseEvent | TouchEvent) => {
        if (!dragStartPosition.current) return;

        const eventTime = getEventTime(e.timeStamp);
        objectsRef.current.forEach((obj) => {
          if (obj.isDragging) {
            obj.vx = lastKnownVelocity.current.vx;
            obj.vy = lastKnownVelocity.current.vy;
            obj.isDragging = false;
            onDragEnd?.(obj.vx, obj.vy, e);
          }
        });

        lastDragEndTime.current = eventTime;
        dragStartPosition.current = null;
        movementHistory.current = [];
        hasBecomeIdleRef.current = false;
        lastActivityTimeRef.current = eventTime;
        forceUpdate();
      },
      [onDragEnd],
    );

    useImperativeHandle(ref, () => ({
      getSlingerPosition: (id = 0) => {
        const obj = objectsRef.current.find((o) => o.id === id);
        return obj ? { x: obj.x, y: obj.y } : null;
      },
    }));

    useEffect(() => {
      const handlePointerMove = (x: number, y: number) => {
        pointerPosition.current = { x, y };
      };

      const handleMouseMove = (e: MouseEvent) => {
        handlePointerMove(e.clientX, e.clientY);
        handleMove(e.clientX, e.clientY, e);
      };

      const handleTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        handlePointerMove(touch.clientX, touch.clientY);
        handleMove(touch.clientX, touch.clientY, e);
      };

      const handleMouseUp = (e: MouseEvent) => {
        endDrag(e);
        clearPointer();
      };

      const handleTouchEnd = (e: TouchEvent) => {
        endDrag(e);
        clearPointer();
      };

      const handleMouseLeave = () => {
        clearPointer();
      };

      window.addEventListener("mouseout", handleMouseLeave);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("mouseout", handleMouseLeave);
      };
    }, [endDrag, handleMove]);

    // 👇 Add this line before the main return block
    if (!isReady) return null;

    return (
      <div ref={containerRef} className={styles.slingerBoxWrapper}>
        {childArray.map((child, i) => {
          const obj = objectsRef.current[i];
          if (!obj) return null;

          const x = Math.round(obj.x - radius);
          const y = Math.round(obj.y - radius);

          return (
            <div
              className={clsx(
                styles.slinger,
                obj.isDragging && "isDragging",
                "slinger",
              )}
              tabIndex={10}
              key={i}
              onMouseDown={(e) => handleMouseDown(i, e)}
              onTouchStart={(e) => handleTouchStart(i, e)}
              ref={(el) => {
                if (el) {
                  slingerRefs.current.set(i, el);
                } else {
                  slingerRefs.current.delete(i);
                }
              }}
              style={{ transform: `translate(${x}px, ${y}px)` }}
            >
              <div className={styles.slingerCenter}>{child}</div>
            </div>
          );
        })}
      </div>
    );
  },
);

SlingerBox.displayName = "SlingerBox";

export default SlingerBox;
