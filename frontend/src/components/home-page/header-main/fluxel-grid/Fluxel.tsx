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

export interface FluxelHandle {
  updateInfluence: (influence: number, colorVariation?: string) => void;
}

const Fluxel = forwardRef<FluxelHandle, { data: FluxelData }>(
  ({ data }, ref) => {
    const elRef = useRef<HTMLDivElement>(null);
    const shadow1Ref = useRef<HTMLDivElement>(null);
    const shadow2Ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      updateInfluence(data.influence, data.colorVariation);
      updateShadowTransforms();
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

    const updateShadowTransforms = () => {
      shadow1Ref.current?.style.setProperty(
        "transform",
        `translate(${data.shadow1OffsetX}px, ${data.shadow1OffsetY}px)`
      );

      shadow2Ref.current?.style.setProperty(
        "transform",
        `translate(${data.shadow2OffsetX}px, ${data.shadow2OffsetY}px) scale(-1, -1)`
      );
    };

    useImperativeHandle(ref, () => ({
      updateInfluence,
    }));

    return (
      <div ref={elRef} className={styles.fluxel}>
        <div
          ref={shadow1Ref}
          className={styles.shadow}
          style={{ opacity: 0.5, backgroundImage: `url(${cornerShadow})` }}
        />
        <div
          ref={shadow2Ref}
          className={styles.shadow}
          style={{ opacity: 0.25, backgroundImage: `url(${cornerShadow})` }}
        />
        {/* Optional debug overlay */}
        {/* <div className={styles.debug}>{data.row},{data.col}</div> */}
      </div>
    );
  }
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
