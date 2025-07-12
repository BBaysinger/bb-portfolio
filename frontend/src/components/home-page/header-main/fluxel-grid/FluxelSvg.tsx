import React, {
  useImperativeHandle,
  useRef,
  forwardRef,
  useEffect,
} from "react";

import type { FluxelHandle, FluxelData } from "./FluxelAllTypes";
import styles from "./FluxelSvg.module.scss";

const FluxelSvg = forwardRef<
  FluxelHandle,
  {
    data: FluxelData;
    x: number;
    y: number;
    size: number;
    clipPathId: string;
    className?: string;
  }
>(({ data, x, y, size, clipPathId, className }, ref) => {
  const elRef = useRef<SVGGElement>(null);
  const SCALE = size / 72;

  useEffect(() => {
    updateInfluence(data.influence, data.colorVariation);
  }, [data]);

  const updateInfluence = (influence: number, colorVariation?: string) => {
    const el = elRef.current;
    if (!el) return;

    el.style.setProperty(
      "--base-color",
      `rgba(20, 20, 20, ${influence * 1.0 - 0.1})`,
    );

    if (colorVariation) {
      el.style.setProperty("--overlay-color", colorVariation);
    }
  };

  useImperativeHandle(ref, () => ({
    updateInfluence,
    updateShadowOffsets: () => {}, // optional noop
  }));

  return (
    <g
      ref={elRef}
      className={[styles.fluxel, className].join(" ")}
      transform={`translate(${x}, ${y})`}
      clipPath={`url(#${clipPathId})`}
    >
      <rect
        width={size - 0.5}
        height={size - 0.5}
        className="border"
        fill="var(--base-color)"
      />

      <image
        opacity="0.5"
        href="/images/home/corner-shadow.webp"
        x={-34 * SCALE}
        y={-110 * SCALE}
        width={216 * SCALE}
        height={216 * SCALE}
        transform={`translate(${data.shadowTrOffsetX * SCALE}, ${data.shadowTrOffsetY * SCALE})`}
      />

      <image
        opacity="0.25"
        href="/images/home/corner-shadow.webp"
        x={-100 * SCALE}
        y={-185 * SCALE}
        width={216 * SCALE}
        height={216 * SCALE}
        transform={`translate(${data.shadowBlOffsetX * SCALE}, ${data.shadowBlOffsetY * SCALE}) scale(-1, -1)`}
      />

      {/* <rect width={size} height={size} fill="var(--overlay-color)" /> */}
    </g>
  );
});

const round = (n: number) => +n.toFixed(2);

function areEqual(
  prev: { data: FluxelData; x: number; y: number; size: number },
  next: { data: FluxelData; x: number; y: number; size: number },
) {
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
    prev.size === next.size
  );
}

FluxelSvg.displayName = "FluxelSvg";

export default React.memo(FluxelSvg, areEqual);
