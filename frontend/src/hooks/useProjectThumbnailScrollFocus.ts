"use client";

import * as React from "react";

type FocusSubscriber = () => void;

type RegisteredThumb = {
  id: string;
  el: HTMLDivElement;
};

type ThumbRect = {
  id: string;
  centerX: number;
  centerY: number;
  height: number;
  width: number;
};

type ThumbRow = {
  centerY: number;
  thumbs: ThumbRect[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const midpoint = (a: number, b: number) => (a + b) / 2;

class ProjectThumbnailFocusStore {
  private readonly items = new Map<string, RegisteredThumb>();
  private readonly subscribers = new Set<FocusSubscriber>();

  private activeId: string | null = null;
  private lastBucketKey: string | null = null;

  private listening = false;
  private rafScheduled = false;

  subscribe = (listener: FocusSubscriber) => {
    this.subscribers.add(listener);
    this.ensureListening();
    this.scheduleRecompute();
    return () => {
      this.subscribers.delete(listener);
      if (this.subscribers.size === 0) {
        this.teardownListening();
      }
    };
  };

  getSnapshot = () => this.activeId;

  register = (id: string, el: HTMLDivElement) => {
    if (!id) return;
    this.items.set(id, { id, el });
    this.ensureListening();
    this.scheduleRecompute();
  };

  unregister = (id: string) => {
    if (!id) return;
    this.items.delete(id);
    if (this.items.size === 0) {
      this.activeId = null;
      this.lastBucketKey = null;
      this.notify();
    } else {
      this.scheduleRecompute();
    }
  };

  private notify() {
    for (const cb of this.subscribers) cb();
  }

  private ensureListening() {
    if (this.listening) return;
    if (typeof window === "undefined") return;

    this.listening = true;
    window.addEventListener("scroll", this.onScrollOrResize, {
      passive: true,
    });
    window.addEventListener("resize", this.onScrollOrResize);
    window.visualViewport?.addEventListener("resize", this.onScrollOrResize);
    window.visualViewport?.addEventListener("scroll", this.onScrollOrResize);
  }

  private teardownListening() {
    if (!this.listening) return;
    if (typeof window === "undefined") return;

    this.listening = false;
    window.removeEventListener("scroll", this.onScrollOrResize);
    window.removeEventListener("resize", this.onScrollOrResize);
    window.visualViewport?.removeEventListener("resize", this.onScrollOrResize);
    window.visualViewport?.removeEventListener("scroll", this.onScrollOrResize);
  }

  private onScrollOrResize = () => {
    this.scheduleRecompute();
  };

  private scheduleRecompute() {
    if (this.rafScheduled) return;
    if (typeof window === "undefined") return;

    this.rafScheduled = true;
    window.requestAnimationFrame(() => {
      this.rafScheduled = false;
      this.recomputeActive();
    });
  }

  private recomputeActive() {
    if (typeof window === "undefined") return;
    if (this.items.size === 0) return;

    const viewportCenterY = window.innerHeight / 2;

    const rects: ThumbRect[] = [];
    for (const { id, el } of this.items.values()) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      rects.push({
        id,
        centerX: r.left + r.width / 2,
        centerY: r.top + r.height / 2,
        height: r.height,
        width: r.width,
      });
    }

    if (rects.length === 0) return;

    rects.sort((a, b) => a.centerY - b.centerY);

    // Group into rows (handles multi-column layouts). Threshold is derived from tile height.
    const medianHeight = (() => {
      const heights = rects.map((r) => r.height).sort((a, b) => a - b);
      return heights[Math.floor(heights.length / 2)] || 0;
    })();

    const rowThreshold = clamp(medianHeight * 0.35 || 24, 12, 80);

    const rows: ThumbRow[] = [];
    for (const tr of rects) {
      const last = rows[rows.length - 1];
      if (!last || Math.abs(tr.centerY - last.centerY) > rowThreshold) {
        rows.push({ centerY: tr.centerY, thumbs: [tr] });
        continue;
      }

      // Add to existing row; keep centerY as running average for stability.
      last.thumbs.push(tr);
      last.centerY =
        (last.centerY * (last.thumbs.length - 1) + tr.centerY) /
        last.thumbs.length;
    }

    for (const row of rows) {
      row.thumbs.sort((a, b) => a.centerX - b.centerX);
    }

    // Determine row by Voronoi partition around row centerlines.
    let chosenRowIndex = 0;
    for (let i = 0; i < rows.length; i++) {
      const prevY = rows[i - 1]?.centerY;
      const currY = rows[i].centerY;
      const nextY = rows[i + 1]?.centerY;

      const start = prevY === undefined ? -Infinity : midpoint(prevY, currY);
      const end = nextY === undefined ? Infinity : midpoint(currY, nextY);

      if (viewportCenterY >= start && viewportCenterY < end) {
        chosenRowIndex = i;
        break;
      }
    }

    const row = rows[chosenRowIndex];
    const cols = row.thumbs.length;

    // Split the row's vertical bucket into sub-buckets per column.
    const prevY = rows[chosenRowIndex - 1]?.centerY;
    const currY = row.centerY;
    const nextY = rows[chosenRowIndex + 1]?.centerY;
    const start = prevY === undefined ? currY - 1 : midpoint(prevY, currY);
    const end = nextY === undefined ? currY + 1 : midpoint(currY, nextY);

    const span = end - start;
    const progress =
      span > 0 ? clamp((viewportCenterY - start) / span, 0, 0.999999) : 0;
    const colIndex =
      cols <= 1 ? 0 : clamp(Math.floor(progress * cols), 0, cols - 1);

    const chosen = row.thumbs[colIndex] || row.thumbs[0];
    const bucketKey = `${chosenRowIndex}:${colIndex}`;

    if (bucketKey === this.lastBucketKey && chosen.id === this.activeId) return;

    if (bucketKey !== this.lastBucketKey) {
      // Bucket-change logging: fires only when the (row, col) bucket changes.
      console.debug(
        `[ProjectThumbnailFocus] bucket changed -> ${bucketKey} (id=${chosen.id})`,
      );
    }

    this.lastBucketKey = bucketKey;
    if (chosen.id !== this.activeId) {
      this.activeId = chosen.id;
      this.notify();
    }
  }
}

const focusStore = new ProjectThumbnailFocusStore();

export type ProjectThumbnailScrollFocusOptions = {
  /**
   * Minimum time (ms) the returned `focused` flag remains true after this
   * thumbnail loses focus. The store's activeId still updates immediately.
   */
  minPersistMs?: number;
};

/**
 * Hook used by each ProjectThumbnail tile to self-register for scroll focus.
 *
 * Focus rules:
 * - Exactly one tile is focused at a time.
 * - The active row is whichever row center is closest to the viewport center (Voronoi buckets).
 * - Within that row bucket, we subdivide the vertical bucket into N sub-buckets (N = tiles in the row)
 *   and focus left-to-right as the viewport center progresses through the bucket.
 * - Updates only occur when the (row, col) bucket changes.
 */
export function useProjectThumbnailScrollFocus(
  id: string,
  options: ProjectThumbnailScrollFocusOptions = {},
) {
  const minPersistMs = options.minPersistMs ?? 250;

  const computeActive = React.useCallback(() => {
    const activeId = focusStore.getSnapshot();
    return activeId != null && activeId === id;
  }, [id]);

  const [active, setActive] = React.useState(() => computeActive());
  // `focused` is what you use for styling: true while active, and lingers
  // for at least `minPersistMs` after losing focus.
  const [focused, setFocused] = React.useState(() => computeActive());

  const activeRef = React.useRef<boolean>(active);
  const focusedRef = React.useRef<boolean>(focused);

  const hideTimerRef = React.useRef<number | null>(null);

  const clearHideTimer = React.useCallback(() => {
    if (hideTimerRef.current == null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  React.useEffect(() => {
    // Keep refs in sync (refs may be read by timeouts/subscription callbacks).
    activeRef.current = active;
    focusedRef.current = focused;

    const onStoreChange = () => {
      const nextActive = computeActive();

      if (nextActive !== activeRef.current) {
        activeRef.current = nextActive;
        setActive(nextActive);
      }

      if (nextActive) {
        clearHideTimer();
        if (!focusedRef.current) {
          focusedRef.current = true;
          setFocused(true);
        }
        return;
      }

      // Lost focus: keep `focused` true for a minimum duration so it has
      // time to fade in before fading out.
      if (focusedRef.current && minPersistMs > 0) {
        clearHideTimer();
        hideTimerRef.current = window.setTimeout(() => {
          hideTimerRef.current = null;
          // Only clear if we didn't regain focus in the meantime.
          if (!activeRef.current) {
            focusedRef.current = false;
            setFocused(false);
          }
        }, minPersistMs);
        return;
      }

      if (focusedRef.current) {
        focusedRef.current = false;
        setFocused(false);
      }
    };

    const unsubscribe = focusStore.subscribe(onStoreChange);

    // Important: the store may have computed activeId before this component
    // subscribed (e.g., during initial mount rAF). Sync once immediately so
    // the focused class applies on first paint.
    onStoreChange();
    return () => {
      unsubscribe();
      clearHideTimer();
    };
  }, [active, clearHideTimer, computeActive, focused, minPersistMs]);

  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (!id) return;

      if (node) {
        focusStore.register(id, node);
        return;
      }

      focusStore.unregister(id);
    },
    [id],
  );

  return { ref, focused, active };
}
