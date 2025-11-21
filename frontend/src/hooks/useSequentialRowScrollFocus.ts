import { useCallback, useEffect, useRef, useState } from "react";

import useDeviceCapabilities from "./useDeviceCapabilities";

/**
 * Reference to a DOM element managed by the hook.
 */
type ItemRef = { current: HTMLDivElement | null };

/**
 * Hook for managing sequential left-to-right scroll focus across grid items.
 *
 * Provides centralized scroll focus logic that highlights thumbnails based on
 * viewport position. When multiple items share a row (detected by vertical midpoint
 * proximity), focus progresses left→right as the user scrolls, using a midpoint-based
 * partition algorithm that is agnostic to gaps between rows.
 *
 * Key behaviors:
 * - Only activates on touch-primary devices (pointer: coarse) to avoid redundancy
 *   on hover-capable desktops.
 * - Guarantees exactly one focused item when viewport center is within the container.
 * - Direction-agnostic: focus selection based purely on geometric midpoint calculations,
 *   not scroll direction.
 * - Gap-agnostic: uses element midpoints and segment partitioning, ignoring spacing
 *   between rows.
 *
 * @param itemCount - Total number of items to track; triggers ref array reset on change.
 * @returns Object containing:
 *   - `focusedIndex`: Current focused item index (-1 if none).
 *   - `setItemRef`: Callback to register DOM node refs for each item.
 *
 * @example
 * ```tsx
 * const { focusedIndex, setItemRef } = useSequentialRowScrollFocus(items.length);
 * items.map((item, i) => (
 *   <Item
 *     key={item.id}
 *     focused={focusedIndex === i}
 *     setRef={(el) => setItemRef(el, i)}
 *   />
 * ));
 * ```
 */

export function useSequentialRowScrollFocus(itemCount: number) {
  const { isTouchPrimary } = useDeviceCapabilities();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const itemRefs = useRef<ItemRef[]>([]);
  const ticking = useRef(false);

  /**
   * Registers a DOM node reference at the specified index.
   *
   * @param node - The DOM element to track (or null to unregister).
   * @param index - Position in the items array.
   */
  const setItemRef = useCallback(
    (node: HTMLDivElement | null, index: number) => {
      if (!itemRefs.current[index]) {
        itemRefs.current[index] = { current: null };
      }
      itemRefs.current[index].current = node;
    },
    [],
  );

  /**
   * Recalculates which item should be focused based on current scroll position.
   *
   * Algorithm:
   * 1. Check if viewport center is within container bounds; clear focus if not.
   * 2. Build inRange array: items whose vertical midpoint band overlaps viewport center.
   * 3. Sort inRange left→right by horizontal position.
   * 4. Partition each item's height into segments (count = inRange.length).
   * 5. Choose the segment whose center is nearest to viewport center.
   * 6. Map chosen segment back to global item index and update focus state.
   */
  const update = useCallback(() => {
    if (typeof window === "undefined" || !isTouchPrimary) return;
    const viewportCenterY = window.innerHeight / 2;

    // Only focus when viewport center is within the container's vertical bounds.
    const container = document.getElementById("projects-list");
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const withinContainer =
      viewportCenterY >= containerRect.top &&
      viewportCenterY <= containerRect.bottom;
    if (!withinContainer) {
      setFocusedIndex(-1);
      return;
    }

    // Build inRange: items whose midpoint band overlaps viewport center.
    const inRange: { ref: ItemRef; rect: DOMRect }[] = [];
    itemRefs.current.forEach((ref) => {
      const el = ref.current;
      if (!el) return;
      const boundsEl = (el.querySelector("a") as HTMLElement) || el;
      const rect = boundsEl.getBoundingClientRect();
      const halfHeight = rect.height / 2;
      const midY = rect.top + halfHeight;
      const offset = viewportCenterY - midY;
      if (Math.abs(offset) < halfHeight) {
        inRange.push({ ref, rect });
      }
    });

    if (inRange.length === 0) {
      setFocusedIndex(-1);
      return;
    }

    // Sort inRange left->right for sequential focus progression.
    inRange.sort((a, b) => a.rect.left - b.rect.left);

    // Partition each item's height into segments (one per inRange item).
    // Choose the segment whose center is nearest to viewport center.
    let bestIdx = -1;
    let bestDelta = Infinity;
    inRange.forEach((entry, i) => {
      const segmentHeight = entry.rect.height / inRange.length;
      const segmentTop = entry.rect.top + segmentHeight * i;
      const segmentCenter = segmentTop + segmentHeight / 2;
      const delta = Math.abs(viewportCenterY - segmentCenter);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    });

    if (bestIdx >= 0) {
      const globalIndex = itemRefs.current.findIndex(
        (r) => r === inRange[bestIdx].ref,
      );
      setFocusedIndex((prev) => (prev !== globalIndex ? globalIndex : prev));
    }
  }, [isTouchPrimary]);

  /**
   * Throttled event handler for scroll and resize events.
   * Uses requestAnimationFrame to batch updates and prevent excessive recalculations.
   */
  const onScrollOrResize = useCallback(() => {
    if (!isTouchPrimary) return;
    if (!ticking.current) {
      window.requestAnimationFrame(() => {
        update();
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, [update, isTouchPrimary]);

  // Attach scroll and resize listeners (touch devices only).
  useEffect(() => {
    if (!isTouchPrimary) return;
    document.addEventListener("scroll", onScrollOrResize);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [onScrollOrResize, isTouchPrimary]);

  // Reset ref array when item count changes (e.g., after data fetch or filter).
  useEffect(() => {
    itemRefs.current = [];
  }, [itemCount]);

  return { focusedIndex, setItemRef };
}
