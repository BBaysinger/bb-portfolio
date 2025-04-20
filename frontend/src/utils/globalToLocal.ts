/**
 * Convert a page‑level coordinate (clientX / clientY) into local
 * coordinates.
 *
 * @param el            Grid element (from gridRef.current)
 * @param clientX       event.clientX
 * @param clientY       event.clientY
 * @returns             { x, y } in local space
 */
export function globalToLocal(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const { left, top } = el.getBoundingClientRect();

  const localX = clientX - left;
  const localY = clientY - top;

  return { x: localX, y: localY };
}
