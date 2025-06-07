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
  }
>(({ data, x, y, size, clipPathId }, ref) => {
  const elRef = useRef<SVGGElement>(null);

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
      className={styles.fluxel}
      transform={`translate(${x}, ${y})`}
      clipPath={`url(#${clipPathId})`}
    >
      <rect width={size} height={size} fill="var(--base-color)" />

      <image
        opacity="0.5"
        href="/images/home/corner-shadow.webp"
        x={-34}
        y={-110}
        width="216"
        height="216"
        transform={`translate(${data.shadowTrOffsetX}, ${data.shadowTrOffsetY})`}
      />
      <image
        opacity="0.25"
        href="/images/home/corner-shadow.webp"
        x={-100}
        y={-185}
        width="216"
        height="216"
        transform={`translate(${data.shadowBlOffsetX}, ${data.shadowBlOffsetY}) scale(-1, -1)`}
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

export default React.memo(FluxelSvg, areEqual);
