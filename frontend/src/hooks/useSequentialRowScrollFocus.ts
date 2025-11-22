import { useCallback, useEffect, useState } from "react";

import useDeviceCapabilities from "./useDeviceCapabilities";

/**
 * Reference to a DOM element managed by the hook.
 */
type ItemRef = { current: HTMLDivElement | null };

/**
 * Singleton focus manager - centralizes all calculations and state.
 * Only one instance exists across all hook instances.
 */
class RowScrollFocusManager {
  private static instance: RowScrollFocusManager;
  private itemRefs: ItemRef[] = [];
  private listeners = new Set<(index: number) => void>();
  private ticking = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingIndex = -1;
  private currentFocusedIndex = -1;

  private constructor() {}

  static getInstance(): RowScrollFocusManager {
    if (!RowScrollFocusManager.instance) {
      RowScrollFocusManager.instance = new RowScrollFocusManager();
    }
    return RowScrollFocusManager.instance;
  }

  registerItem(index: number, node: HTMLDivElement | null): void {
    if (!this.itemRefs[index]) {
      this.itemRefs[index] = { current: null };
    }
    this.itemRefs[index].current = node;
  }

  subscribe(callback: (index: number) => void): () => void {
    this.listeners.add(callback);
    // Immediately notify with current state
    callback(this.currentFocusedIndex);

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(index: number): void {
    this.currentFocusedIndex = index;
    this.listeners.forEach((callback) => callback(index));
  }

  update(isTouchPrimary: boolean): void {
    if (typeof window === "undefined" || !isTouchPrimary) {
      this.notifyListeners(-1);
      return;
    }

    const viewportCenterY = window.innerHeight / 2;

    // Get all valid element references with their positions
    const elementData = this.itemRefs
      .map((ref, idx) => {
        if (!ref?.current) return null;
        const el = ref.current;
        const boundsEl = (el.querySelector("a") as HTMLElement) || el;
        const rect = boundsEl.getBoundingClientRect();
        return {
          ref,
          idx,
          midX: rect.left + rect.width / 2,
          midY: rect.top + rect.height / 2,
          top: rect.top,
          height: rect.height,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (elementData.length === 0) {
      this.notifyListeners(-1);
      return;
    }

    // Group into rows by matching midY (within 1px tolerance for floating point)
    const rows: (typeof elementData)[] = [];
    const grouped = new Set<number>();

    elementData.forEach((item, i) => {
      if (grouped.has(i)) return;

      const row = [item];
      grouped.add(i);

      // Find all items with matching midY
      for (let j = i + 1; j < elementData.length; j++) {
        if (grouped.has(j)) continue;
        if (Math.abs(elementData[j].midY - item.midY) < 1) {
          row.push(elementData[j]);
          grouped.add(j);
        }
      }

      // Sort row left-to-right
      row.sort((a, b) => a.midX - b.midX);
      rows.push(row);
    });

    console.log(
      `[RowScrollFocus] Detected ${rows.length} rows:`,
      rows.map((row) => `${row.length} items at Y=${Math.round(row[0].midY)}`),
    );

    if (rows.length === 0) {
      this.notifyListeners(-1);
      return;
    }

    // Find row closest to viewport center
    let closestRow = rows[0];
    let minDistance = Math.abs(rows[0][0].midY - viewportCenterY);

    for (const row of rows) {
      const distance = Math.abs(row[0].midY - viewportCenterY);
      if (distance < minDistance) {
        minDistance = distance;
        closestRow = row;
      }
    }

    console.log(
      `[RowScrollFocus] Selected row: ${closestRow.length} items at Y=${Math.round(closestRow[0].midY)}, distance=${Math.round(minDistance)}px from center`,
    );

    // For the selected row, divide row height into N equal segments
    const rowItemCount = closestRow.length;
    const rowHeight = closestRow[0].height;
    const rowTop = closestRow[0].top;
    const segmentHeight = rowHeight / rowItemCount;

    // Determine which segment the viewport center falls into
    const relativeY = viewportCenterY - rowTop;
    const segmentIndex = Math.floor(relativeY / segmentHeight);
    const clampedIndex = Math.max(0, Math.min(segmentIndex, rowItemCount - 1));

    const selectedItem = closestRow[clampedIndex];
    const targetIndex = selectedItem.idx;

    // Debounce: only update focus if the same item stays selected for 300ms
    if (this.pendingIndex !== targetIndex) {
      this.pendingIndex = targetIndex;

      // Clear existing timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Set new timer
      this.debounceTimer = setTimeout(() => {
        console.log(
          `[RowScrollFocus] Focused item ${targetIndex} (segment ${clampedIndex + 1}/${rowItemCount}) after stabilization`,
        );
        this.notifyListeners(targetIndex);
        this.debounceTimer = null;
      }, 300);
    }
  }

  onViewportChange(isTouchPrimary: boolean): void {
    if (!isTouchPrimary) return;
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.update(isTouchPrimary);
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  reset(): void {
    this.itemRefs = [];
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

/**
 * Hook for managing sequential left-to-right scroll focus across grid items.
 *
 * Uses a centralized singleton to determine which thumbnail has pseudo-focus
 * based on simple midpoint mathematics. All component instances share the same
 * calculation logic, ensuring consistent behavior across the page.
 *
 * Algorithm (handled by singleton):
 * 1. Group thumbnails into rows by matching vertical midpoints
 * 2. Find the row whose midpoint is closest to viewport center
 * 3. Within that row, divide row height by N (number of items in row)
 * 4. Assign focus based on which segment the viewport center falls into
 *
 * Key behaviors:
 * - Only activates on touch-primary devices (pointer: coarse)
 * - Guarantees exactly ONE focused item at any time across all instances
 * - Works for any number of columns (1, 2, 3, 4, etc.)
 * - Ignores grid gaps - only uses midpoints for all calculations
 *
 * @param itemCount - Total number of items to track
 * @returns Object containing:
 *   - `focusedIndex`: Current focused item index (-1 if none)
 *   - `setItemRef`: Callback to register DOM node refs for each item
 */

export function useSequentialRowScrollFocus(itemCount: number) {
  const { isTouchPrimary } = useDeviceCapabilities();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const manager = RowScrollFocusManager.getInstance();

  /**
   * Registers a DOM node reference at the specified index with the singleton manager.
   */
  const setItemRef = useCallback(
    (node: HTMLDivElement | null, index: number) => {
      manager.registerItem(index, node);
    },
    [manager],
  );

  // Subscribe to singleton focus updates
  useEffect(() => {
    const unsubscribe = manager.subscribe(setFocusedIndex);
    return unsubscribe;
  }, [manager]);

  // Viewport change handler
  const onViewportChange = useCallback(() => {
    manager.onViewportChange(isTouchPrimary);
  }, [manager, isTouchPrimary]);

  // Attach all viewport dimension change listeners (touch devices only)
  useEffect(() => {
    if (!isTouchPrimary) return;

    // Standard window events
    document.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);

    // Fullscreen events
    document.addEventListener("fullscreenchange", onViewportChange);

    // Page visibility (tab switching can affect layout in some browsers)
    document.addEventListener("visibilitychange", onViewportChange);

    // Visual viewport events (for mobile keyboards, pinch zoom, etc.)
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener("resize", onViewportChange);
      visualViewport.addEventListener("scroll", onViewportChange);
    }

    console.log("[RowScrollFocus] Attached viewport change listeners");

    return () => {
      document.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      document.removeEventListener("fullscreenchange", onViewportChange);
      document.removeEventListener("visibilitychange", onViewportChange);

      if (visualViewport) {
        visualViewport.removeEventListener("resize", onViewportChange);
        visualViewport.removeEventListener("scroll", onViewportChange);
      }

      console.log("[RowScrollFocus] Removed viewport change listeners");
    };
  }, [onViewportChange, isTouchPrimary]);

  // Reset singleton when item count changes
  useEffect(() => {
    manager.reset();
  }, [itemCount, manager]);

  return { focusedIndex, setItemRef };
}
