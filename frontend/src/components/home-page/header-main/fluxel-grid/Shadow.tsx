import React from "react";

import cornerShadow from "images/main-header/corner-shadow.webp";
import styles from "./Shadow.module.scss";

interface ShadowProps {
  className?: string;
  x1: number;
  y1: number;
}

/**
 * Registration is set to the corner of the origin of the shadows, and
 * positioned to the top right of the fluxel.
 *
 * This had two shadows to create a more realistic effect, but it wasn't
 * realistic to implement for performance reasons. Will try to implement
 * it in the PixiJS version.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Shadow: React.FC<ShadowProps> = ({ className, x1, y1 }) => {
  const xPos = Math.round(Math.min(x1, 0));
  const yPos = Math.round(Math.max(y1, 0));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1in"
      height="1in"
      viewBox="0 0 72 72"
      className={`${styles["shadow"]} ${className}`}
    >
      <g opacity="0.5">
        <g transform={`translate(${xPos}, ${yPos})`}>
          <image
            href={cornerShadow}
            x={-34}
            y={-110}
            width="216"
            height="216"
          />
        </g>
      </g>
    </svg>
    // <div>
    //   <img
    //     src={cornerShadow}
    //     alt="Shadow"
    //     className={`${styles["shadow"]} ${className}`}
    //     style={{
    //       transform: `translate(${xPos}px, ${yPos}px)`,
    //       position: "absolute",
    //       width: "216px",
    //       height: "216px",
    //       left: "-10px",
    //       top: "-110px",
    //       opacity: 0.5,
    //       filter: "blur(2px)",
    //     }}
    //   />
    // </div>
  );
};

export default Shadow;
