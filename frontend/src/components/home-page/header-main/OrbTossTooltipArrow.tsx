/**
 * Decorative SVG arrowhead used by `OrbTossTooltip`.
 *
 * Kept inline so styling can be driven by CSS (`currentColor`, stroke width) and
 * animations can be applied by the parent wrapper.
 */

import styles from "./OrbTossTooltip.module.scss";

/**
 * OrbTossTooltipArrow
 *
 * Inline SVG arrowhead so color can be driven via currentColor and width via CSS.
 * Stroke color inherits from parent color; width can be controlled with
 * --arrow-stroke-width in CSS. Rotation/animation comes from wrapper/SCSS.
 */
function OrbTossTooltipArrow() {
  return (
    <svg
      className={styles.arrowSvg}
      viewBox="0 0 61.71 41.89"
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        points="43.07 12.2 43.09 1.26 18.61 1.26 18.63 12.2 3.03 12.2 30.84 40.1 58.67 12.2 43.07 12.2"
        fill="none"
        stroke="currentColor"
        strokeMiterlimit={9.91}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default OrbTossTooltipArrow;
