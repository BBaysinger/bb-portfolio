import React, {
  useImperativeHandle,
  useRef,
  forwardRef,
  useEffect,
} from "react";

import type { FluxelHandle, FluxelData } from "./FluxelAllTypes";
import styles from "./FluxelDomSvg.module.scss";

/**
 * Fluxing Pixel
 *
 * A square/pixel on the grid that can simulate depth and have color variations
 * applied to it.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const FluxelDomSvg = forwardRef<FluxelHandle, { data: FluxelData }>(
  ({ data }, ref) => {
    const elRef = useRef<SVGSVGElement>(null);

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
      updateShadowOffsets: () => {}, // no-op to fulfill interface
    }));

    return (
      <svg
        ref={elRef}
        className={styles.fluxel}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 72 72"
      >
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
        {/* <rect width="72" height="72" fill="var(--overlay-color)" /> */}
      </svg>
    );
  },
);

const round = (n: number) => +n.toFixed(2);

function areEqual(prev: { data: FluxelData }, next: { data: FluxelData }) {
  const a = prev.data;
  const b = next.data;
  return (
    round(a.influence) === round(b.influence) &&
    a.shadowTrOffsetX === b.shadowTrOffsetX &&
    a.shadowTrOffsetY === b.shadowTrOffsetY &&
    a.shadowBlOffsetX === b.shadowBlOffsetX &&
    a.shadowBlOffsetY === b.shadowBlOffsetY &&
    a.colorVariation === b.colorVariation
  );
}

export default React.memo(FluxelDomSvg, areEqual);
