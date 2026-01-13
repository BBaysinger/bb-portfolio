/**
 * SVG renderer for a single Fluxel cell.
 *
 * This component is used by the SVG grid renderer to draw an individual “pixel”
 * with depth-like corner shading. It exposes a small imperative surface
 * (via `FluxelHandle`) so external systems (cursor influence, projectiles)
 * can update visual intensity without needing to know which renderer is active.
 */

import clsx from "clsx";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import type { FluxelHandle, FluxelData } from "./FluxelAllTypes";
import styles from "./FluxelSvg.module.scss";

type FluxelSvgProps = {
  data: FluxelData;
  x: number;
  y: number;
  size: number;
  clipPathId: string;
  className?: string;
};

/**
 * Individual SVG-rendered Fluxel component.
 *
 * Renders a single animated pixel (fluxel) using SVG graphics with color cycling,
 * shadow effects, and transform-based positioning. Each fluxel responds to magnetic
 * forces and maintains its own animation state.
 *
 * @component
 * @param {Object} props - Component props
 * @param {FluxelData} props.data - Fluxel animation and state data
 * @param {number} props.x - X position in the grid
 * @param {number} props.y - Y position in the grid
 * @param {number} props.size - Size for scaling calculations
 * @param {string} props.clipPathId - SVG clip path ID for masking
 * @param {string} [props.className] - Optional CSS class names
 * @param {FluxelHandle} ref - Forwarded ref for external control
 */
const FluxelSvg = forwardRef<FluxelHandle, FluxelSvgProps>(
  ({ data, x, y, size, clipPathId, className }, ref) => {
    const elRef = useRef<SVGGElement>(null);

    // The shadow texture positioning was authored against a 72px reference grid.
    // Scale factors derive all offsets/sizes from the current fluxel size.
    const SHADOW_REFERENCE_PX = 72;
    const SCALE = size / SHADOW_REFERENCE_PX;

    const updateInfluence = useCallback(
      (influence: number, colorVariation?: string) => {
        const el = elRef.current;
        if (!el) return;

        const alpha = Math.min(1, Math.max(0, influence - 0.1));
        el.style.setProperty("--base-color", `rgba(20, 20, 20, ${alpha})`);

        if (colorVariation) {
          el.style.setProperty("--overlay-color", colorVariation);
        } else {
          // Prevent stale values if a cell transitions from having a variation to none.
          el.style.removeProperty("--overlay-color");
        }
      },
      [],
    );

    useEffect(() => {
      updateInfluence(data.influence, data.colorVariation);
    }, [data.influence, data.colorVariation, updateInfluence]);

    useImperativeHandle(ref, () => ({
      updateInfluence,
      // `FluxelHandle` doesn't require shadow updates. Some renderers support
      // extra imperative APIs (see `IFluxel`), but the SVG cell is driven solely
      // by the `FluxelData` props passed down from the grid.
      updateShadowOffsets: () => {},
    }));

    return (
      <g
        ref={elRef}
        className={clsx(styles.fluxel, className)}
        transform={`translate(${x}, ${y})`}
        clipPath={`url(#${clipPathId})`}
      >
        <rect
          width={size - 0.5}
          height={size - 0.5}
          className="base"
          fill="var(--base-color)"
        />

        <image
          opacity="0.5"
          href="/images/hero/corner-shadow.webp"
          x={-34 * SCALE}
          y={-110 * SCALE}
          width={216 * SCALE}
          height={216 * SCALE}
          transform={`translate(${data.shadowTrOffsetX * SCALE}, ${data.shadowTrOffsetY * SCALE})`}
        />

        <image
          opacity="0.25"
          href="/images/hero/corner-shadow.webp"
          x={-100 * SCALE}
          y={-185 * SCALE}
          width={216 * SCALE}
          height={216 * SCALE}
          // Mirror the same texture to approximate bottom-left depth shading.
          transform={`translate(${data.shadowBlOffsetX * SCALE}, ${data.shadowBlOffsetY * SCALE}) scale(-1, -1)`}
        />
      </g>
    );
  },
);

const round = (n: number) => +n.toFixed(2);

function areEqual(prev: FluxelSvgProps, next: FluxelSvgProps) {
  const a = prev.data;
  const b = next.data;
  return (
    round(a.influence) === round(b.influence) &&
    a.shadowTrOffsetX === b.shadowTrOffsetX &&
    a.shadowTrOffsetY === b.shadowTrOffsetY &&
    a.shadowBlOffsetX === b.shadowBlOffsetX &&
    a.shadowBlOffsetY === b.shadowBlOffsetY &&
    a.colorVariation === b.colorVariation &&
    prev.x === next.x &&
    prev.y === next.y &&
    prev.size === next.size &&
    prev.clipPathId === next.clipPathId &&
    prev.className === next.className
  );
}

FluxelSvg.displayName = "FluxelSvg";

export default memo(FluxelSvg, areEqual);
