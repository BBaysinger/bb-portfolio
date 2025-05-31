import React, {
  useImperativeHandle,
  useRef,
  forwardRef,
  useEffect,
} from "react";

import cornerShadow from "images/hero/corner-shadow.webp";
import styles from "./Fluxel.module.scss";

export interface FluxelData {
  id: string;
  row: number;
  col: number;
  influence: number;

  shadow1OffsetX: number;
  shadow1OffsetY: number;

  shadow2OffsetX: number;
  shadow2OffsetY: number;

  colorVariation?: string;
}

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
export interface FluxelHandle {
  updateInfluence: (influence: number, colorVariation?: string) => void;
}

/**
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Fluxel = forwardRef<FluxelHandle, { data: FluxelData }>(
  ({ data }, ref) => {
    const elRef = useRef<SVGSVGElement>(null);

    // Initial props-driven style
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
          href={cornerShadow}
          x={-34}
          y={-110}
          width="216"
          height="216"
          transform={`translate(${data.shadow1OffsetX}, ${data.shadow1OffsetY})`}
        />
        <image
          opacity="0.25"
          href={cornerShadow}
          x={-100}
          y={-185}
          width="216"
          height="216"
          transform={`translate(${data.shadow2OffsetX}, ${data.shadow2OffsetY}) scale(-1, -1)`}
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
    a.shadow1OffsetX === b.shadow1OffsetX &&
    a.shadow1OffsetY === b.shadow1OffsetY &&
    a.shadow2OffsetX === b.shadow2OffsetX &&
    a.shadow2OffsetY === b.shadow2OffsetY &&
    a.colorVariation === b.colorVariation
  );
}

export default React.memo(Fluxel, areEqual);
