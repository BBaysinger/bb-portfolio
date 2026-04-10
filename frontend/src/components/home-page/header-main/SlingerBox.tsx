import clsx from "clsx";
import React, {
  useRef,
  useEffect,
  useCallback,
  useReducer,
  useImperativeHandle,
  useMemo,
} from "react";

import { useElementMonitor } from "@/hooks/useLayoutMonitor";
import MiscUtils from "@/utils/MiscUtils";

import { Side } from "./BorderBlinker";
import styles from "./SlingerBox.module.scss";

const getEventTime = (timeStamp?: number) =>
  typeof timeStamp === "number" && !Number.isNaN(timeStamp)
    ? timeStamp
    : Date.now();

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const reflectOvershoot = (
  position: number,
  min: number,
  max: number,
): number => {
  if (position < min) {
    return min + (min - position);
  }
  if (position > max) {
    return max - (position - max);
  }
  return position;
};

const clampVectorMagnitude = (
  vx: number,
  vy: number,
  maxMagnitude: number,
): { vx: number; vy: number } => {
  const magnitude = Math.hypot(vx, vy);
  if (magnitude <= maxMagnitude || magnitude === 0) {
    return { vx, vy };
  }

  const scale = maxMagnitude / magnitude;
  return {
    vx: vx * scale,
    vy: vy * scale,
  };
};

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
 * SlingerBox component
 *
 * Renders draggable slingers inside a bounded container with sampled release
 * velocity, wall reflection, and optional pointer attraction.
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
    const radius = ballSize / 2;
    const idleSpeedThreshold = 0.75;
    const desiredFPS = 60;
    const frameInterval = 1000 / desiredFPS;
    const [, forceUpdate] = useReducer((x) => x + 1, 0);
    const childArray = React.Children.toArray(children);
    const gravityRange = 300;
    const gravityWallInset = Math.min(12, radius * 0.5);
    const wallSeparationNudge = 1;
    const collisionRestitution = 0.88;
    const minimumBounceSpeed = 0.9;
    const minimumWallCollisionNotifySpeed = 2.5;
    const postReleaseGravityDelayMs = 500;
    const minimumDragReleaseSpeed = 1.2;
    const maximumReleaseSpeed = 450;
    const highSpeedDampingFactor = 0.974;
    const dampingEaseSpeedRange = 10;
    const stopSpeedThreshold = 0.02;
    const freeFlightSpeedFloor = 0.0;
    const initialAmbientVelocityXMin = 0.28;
    const initialAmbientVelocityXMax = 0.46;
    const initialAmbientVelocityYMin = 0.32;
    const initialAmbientVelocityYMax = 0.52;
    const pointerSettleDamping = 0.76;
    const pointerSettleBlend = 0.35;
    const pointerSnapDistance = 1.5;

    const [isReady, setIsReady] = React.useState(false);

    const animationFrameRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
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

    const layoutDebounceMap = useMemo(
      () => ({ resize: 50, position: -1, mutate: -1 }),
      [],
    );

    const clampObjectsToBounds = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;

      const bounds = container.getBoundingClientRect();
      const maxX = Math.max(radius, bounds.width - radius);
      const maxY = Math.max(radius, bounds.height - radius);

      objectsRef.current.forEach((obj) => {
        obj.x = Math.min(Math.max(obj.x, radius), maxX);
        obj.y = Math.min(Math.max(obj.y, radius), maxY);

        const el = slingerRefs.current.get(obj.id);
        if (el) {
          el.style.transform = `translate(${Math.round(obj.x - radius)}px, ${Math.round(obj.y - radius)}px)`;
        }
      });
    }, [radius]);

    useElementMonitor(
      containerRef,
      (eventType) => {
        if (eventType === "resize") clampObjectsToBounds();
      },
      layoutDebounceMap,
    );

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
            let collidedThisFrame = false;
            const minX = radius;
            const maxX = Math.max(radius, bounds.width - radius);
            const minY = radius;
            const maxY = Math.max(radius, bounds.height - radius);

            // Pause pointer attraction briefly after release or collision so the
            // slinger can escape the cursor before homing resumes.
            const gravityEnabled =
              pointerGravity > 0 &&
              pointerPosition.current &&
              frameTime - lastDragEndTime.current > postReleaseGravityDelayMs;

            if (gravityEnabled && pointerPosition.current) {
              const gravityMinX = Math.min(maxX, minX + gravityWallInset);
              const gravityMaxX = Math.max(minX, maxX - gravityWallInset);
              const gravityMinY = Math.min(maxY, minY + gravityWallInset);
              const gravityMaxY = Math.max(minY, maxY - gravityWallInset);
              const pointerX =
                clamp(
                  pointerPosition.current.x - bounds.left,
                  gravityMinX,
                  gravityMaxX,
                ) + bounds.left;
              const pointerY =
                clamp(
                  pointerPosition.current.y - bounds.top,
                  gravityMinY,
                  gravityMaxY,
                ) + bounds.top;

              const dx = pointerX - (bounds.left + x);
              const dy = pointerY - (bounds.top + y);
              const distance = Math.hypot(dx, dy);

              if (distance < gravityRange && distance > 1) {
                const closeEnough = 8;
                if (distance < closeEnough) {
                  x += dx * pointerSettleBlend;
                  y += dy * pointerSettleBlend;
                  vx *= pointerSettleDamping;
                  vy *= pointerSettleDamping;

                  if (
                    distance < pointerSnapDistance &&
                    Math.hypot(vx, vy) < stopSpeedThreshold
                  ) {
                    vx = 0;
                    vy = 0;
                  }
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

            const incomingVx = vx;
            const incomingVy = vy;
            const impactSpeed = Math.hypot(incomingVx, incomingVy);
            const nextX = x + vx;
            const nextY = y + vy;
            x = nextX;
            y = nextY;

            if (nextX <= minX && incomingVx < 0) {
              x = reflectOvershoot(nextX, minX, maxX);
              x = Math.max(x, minX + wallSeparationNudge);
              vx = Math.max(
                -incomingVx * collisionRestitution,
                minimumBounceSpeed,
              );
              vy = incomingVy;
              collidedThisFrame = true;
              if (impactSpeed >= minimumWallCollisionNotifySpeed) {
                onWallCollision?.("left", 0, Math.round(y));
              }
            }
            if (nextX >= maxX && incomingVx > 0) {
              x = reflectOvershoot(nextX, minX, maxX);
              x = Math.min(x, maxX - wallSeparationNudge);
              vx = Math.min(
                -incomingVx * collisionRestitution,
                -minimumBounceSpeed,
              );
              vy = incomingVy;
              collidedThisFrame = true;
              if (impactSpeed >= minimumWallCollisionNotifySpeed) {
                onWallCollision?.("right", bounds.width, Math.round(y));
              }
            }
            if (nextY <= minY && incomingVy < 0) {
              y = reflectOvershoot(nextY, minY, maxY);
              y = Math.max(y, minY + wallSeparationNudge);
              vy = Math.max(
                -incomingVy * collisionRestitution,
                minimumBounceSpeed,
              );
              vx = incomingVx;
              collidedThisFrame = true;
              if (impactSpeed >= minimumWallCollisionNotifySpeed) {
                onWallCollision?.("top", Math.round(x), 0);
              }
            }
            if (nextY >= maxY && incomingVy > 0) {
              y = reflectOvershoot(nextY, minY, maxY);
              y = Math.min(y, maxY - wallSeparationNudge);
              vy = Math.min(
                -incomingVy * collisionRestitution,
                -minimumBounceSpeed,
              );
              vx = incomingVx;
              collidedThisFrame = true;
              if (impactSpeed >= minimumWallCollisionNotifySpeed) {
                onWallCollision?.("bottom", Math.round(x), bounds.height);
              }
            }

            x = clamp(x, minX, maxX);
            y = clamp(y, minY, maxY);

            const speed = Math.hypot(vx, vy);

            if (!collidedThisFrame && speed > 0) {
              // Ease damping off as speed drops so ricochet tails linger
              // instead of snapping to a stop.
              const targetMinimumSpeed = gravityEnabled
                ? 0
                : freeFlightSpeedFloor;
              const dampingProgress = MiscUtils.smoothStep(
                targetMinimumSpeed,
                targetMinimumSpeed + dampingEaseSpeedRange,
                speed,
              );
              const effectiveDampingFactor =
                1 - (1 - highSpeedDampingFactor) * dampingProgress;
              const reducedSpeed = Math.max(
                speed * effectiveDampingFactor,
                targetMinimumSpeed,
              );

              if (reducedSpeed === 0 || reducedSpeed < stopSpeedThreshold) {
                vx = 0;
                vy = 0;
              } else {
                const scale = reducedSpeed / speed;
                vx *= scale;
                vy *= scale;
              }
            }

            if (Math.hypot(vx, vy) < stopSpeedThreshold) {
              vx = 0;
              vy = 0;
            }

            // Write back
            obj.x = x;
            obj.y = y;
            obj.vx = vx;
            obj.vy = vy;

            // Idle detection
            const finalSpeed = Math.hypot(vx, vy);
            if (finalSpeed < idleSpeedThreshold && !obj.isDragging) {
              if (!hasBecomeIdleRef.current) {
                hasBecomeIdleRef.current = true;
                onIdle?.();
              }
            } else {
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
      [
        frameInterval,
        gravityWallInset,
        onIdle,
        onWallCollision,
        postReleaseGravityDelayMs,
        pointerGravity,
        radius,
      ],
    );

    useEffect(() => {
      if (objectsRef.current.length === 0) {
        objectsRef.current = childArray.map((_, i) => {
          const initialVelocityX =
            initialAmbientVelocityXMin +
            Math.random() *
              (initialAmbientVelocityXMax - initialAmbientVelocityXMin);
          const initialVelocityY =
            initialAmbientVelocityYMin +
            Math.random() *
              (initialAmbientVelocityYMax - initialAmbientVelocityYMin);

          return {
            id: i,
            x: 0.2 * window.innerWidth + i * 60,
            y: 0.3 * window.innerHeight,
            vx: initialVelocityX,
            vy: initialVelocityY,
            isDragging: false,
          };
        });
        setIsReady(true);
      }
    }, [
      childArray,
      initialAmbientVelocityXMax,
      initialAmbientVelocityXMin,
      initialAmbientVelocityYMax,
      initialAmbientVelocityYMin,
    ]);

    useEffect(() => {
      if (!isReady) return;
      clampObjectsToBounds();
    }, [isReady, clampObjectsToBounds]);

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

    const releaseDraggedObject = useCallback(
      (
        obj: SlingerObject,
        vx: number,
        vy: number,
        eventTime: number,
        nativeEvent: MouseEvent | TouchEvent,
      ) => {
        const cappedVelocity = clampVectorMagnitude(
          vx,
          vy,
          maximumReleaseSpeed,
        );

        obj.vx = cappedVelocity.vx;
        obj.vy = cappedVelocity.vy;
        obj.isDragging = false;

        lastDragEndTime.current = eventTime;
        dragStartPosition.current = null;
        movementHistory.current = [];
        hasBecomeIdleRef.current = false;
        forceUpdate();
        onDragEnd?.(obj.vx, obj.vy, nativeEvent);
      },
      [maximumReleaseSpeed, onDragEnd],
    );

    /** Handle dragging movement */
    const handleMove = useCallback(
      (clientX: number, clientY: number, e: MouseEvent | TouchEvent) => {
        if (!dragStartPosition.current) return;

        const container = containerRef.current;
        const bounds = container?.getBoundingClientRect();
        const minX = radius;
        const maxX = bounds ? Math.max(radius, bounds.width - radius) : null;
        const minY = radius;
        const maxY = bounds ? Math.max(radius, bounds.height - radius) : null;
        const eventTime = getEventTime(e.timeStamp);

        const previousSample = movementHistory.current.at(-1);
        const sampleElapsedSeconds = previousSample
          ? Math.max((eventTime - previousSample.time) / 1000, 1 / 240)
          : 1 / 60;
        const dragDeltaX = clientX - dragStartPosition.current.x;
        const dragDeltaY = clientY - dragStartPosition.current.y;
        const currentSampleVx = (dragDeltaX / sampleElapsedSeconds) * 0.1;
        const currentSampleVy = (dragDeltaY / sampleElapsedSeconds) * 0.1;
        const collisionVelocityX =
          Math.abs(currentSampleVx) > Math.abs(lastKnownVelocity.current.vx)
            ? currentSampleVx
            : lastKnownVelocity.current.vx;
        const collisionVelocityY =
          Math.abs(currentSampleVy) > Math.abs(lastKnownVelocity.current.vy)
            ? currentSampleVy
            : lastKnownVelocity.current.vy;

        let dragReleasedByCollision = false;

        objectsRef.current.forEach((obj) => {
          if (obj.isDragging && dragStartPosition.current) {
            const nextX = obj.x + (clientX - dragStartPosition.current.x);
            const nextY = obj.y + (clientY - dragStartPosition.current.y);
            const dragImpactSpeed = Math.hypot(
              collisionVelocityX,
              collisionVelocityY,
            );

            let reflectedVx = collisionVelocityX;
            let reflectedVy = collisionVelocityY;
            let collidedWall: Side | null = null;
            let collisionX = nextX;
            let collisionY = nextY;

            if (maxX !== null && nextX <= minX && collisionVelocityX < 0) {
              collisionX = reflectOvershoot(nextX, minX, maxX);
              collisionX = Math.max(collisionX, minX + wallSeparationNudge);
              reflectedVx = Math.max(
                -collisionVelocityX * collisionRestitution,
                minimumDragReleaseSpeed,
              );
              collidedWall = "left";
            } else if (
              maxX !== null &&
              nextX >= maxX &&
              collisionVelocityX > 0
            ) {
              collisionX = reflectOvershoot(nextX, minX, maxX);
              collisionX = Math.min(collisionX, maxX - wallSeparationNudge);
              reflectedVx = Math.min(
                -collisionVelocityX * collisionRestitution,
                -minimumDragReleaseSpeed,
              );
              collidedWall = "right";
            }

            if (maxY !== null && nextY <= minY && collisionVelocityY < 0) {
              collisionY = reflectOvershoot(nextY, minY, maxY);
              collisionY = Math.max(collisionY, minY + wallSeparationNudge);
              reflectedVy = Math.max(
                -collisionVelocityY * collisionRestitution,
                minimumDragReleaseSpeed,
              );
              collidedWall = "top";
            } else if (
              maxY !== null &&
              nextY >= maxY &&
              collisionVelocityY > 0
            ) {
              collisionY = reflectOvershoot(nextY, minY, maxY);
              collisionY = Math.min(collisionY, maxY - wallSeparationNudge);
              reflectedVy = Math.min(
                -collisionVelocityY * collisionRestitution,
                -minimumDragReleaseSpeed,
              );
              collidedWall = "bottom";
            }

            obj.x = maxX === null ? nextX : clamp(collisionX, minX, maxX);
            obj.y = maxY === null ? nextY : clamp(collisionY, minY, maxY);
            dragStartPosition.current = { x: clientX, y: clientY };

            const el = slingerRefs.current.get(obj.id);
            if (el) {
              el.style.transform = `translate(${Math.round(
                obj.x - radius,
              )}px, ${Math.round(obj.y - radius)}px)`;
            }

            if (collidedWall) {
              dragReleasedByCollision = true;

              switch (collidedWall) {
                case "left":
                  if (dragImpactSpeed >= minimumWallCollisionNotifySpeed) {
                    onWallCollision?.("left", 0, Math.round(obj.y));
                  }
                  break;
                case "right":
                  if (dragImpactSpeed >= minimumWallCollisionNotifySpeed) {
                    onWallCollision?.(
                      "right",
                      bounds?.width ?? 0,
                      Math.round(obj.y),
                    );
                  }
                  break;
                case "top":
                  if (dragImpactSpeed >= minimumWallCollisionNotifySpeed) {
                    onWallCollision?.("top", Math.round(obj.x), 0);
                  }
                  break;
                case "bottom":
                  if (dragImpactSpeed >= minimumWallCollisionNotifySpeed) {
                    onWallCollision?.(
                      "bottom",
                      Math.round(obj.x),
                      bounds?.height ?? 0,
                    );
                  }
                  break;
              }

              releaseDraggedObject(obj, reflectedVx, reflectedVy, eventTime, e);
            }
          }
        });

        if (dragReleasedByCollision) {
          e.preventDefault();
          return;
        }

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
      [
        collisionRestitution,
        minimumDragReleaseSpeed,
        onWallCollision,
        radius,
        releaseDraggedObject,
      ],
    );

    const endDrag = useCallback(
      (e: MouseEvent | TouchEvent) => {
        if (!dragStartPosition.current) return;

        const eventTime = getEventTime(e.timeStamp);
        objectsRef.current.forEach((obj) => {
          if (obj.isDragging) {
            releaseDraggedObject(
              obj,
              lastKnownVelocity.current.vx,
              lastKnownVelocity.current.vy,
              eventTime,
              e,
            );
          }
        });
      },
      [releaseDraggedObject],
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
