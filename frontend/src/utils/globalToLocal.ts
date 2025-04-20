/**
 * Convert a page‑level coordinate (clientX / clientY) into grid‑local
 * coordinates, clamped to the rectangular “viewable” window that is
 * centred inside the grid element.
 *
 * @param el            Grid element (from gridRef.current)
 * @param clientX       event.clientX  ‑or‑  externalPos.x (page space)
 * @param clientY       event.clientY  ‑or‑  externalPos.y (page space)
 * @param viewWidth     width of the active window inside the grid
 * @param viewHeight    height of the active window inside the grid
 * @returns             { x, y } in grid‑local space, or null if outside
 */
export function globalToLocal(
  el: HTMLElement | null,
  clientX: number,
  clientY: number,
  viewWidth: number,
  viewHeight: number,
): { x: number; y: number } | null {
  if (!el) return null;

  const { left, top, width, height } = el.getBoundingClientRect();

  // The window you care about is centred inside the full grid rectangle.
  const offsetX = (width - viewWidth) / 2;
  const offsetY = (height - viewHeight) / 2;

  const localX = clientX - left;
  const localY = clientY - top;

  if (
    localX < offsetX ||
    localX > offsetX + viewWidth ||
    localY < offsetY ||
    localY > offsetY + viewHeight
  ) {
    return null; // outside viewable window
  }

  return { x: localX, y: localY };
}
