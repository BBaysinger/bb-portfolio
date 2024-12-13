import React from "react";

import { MobileOrientation } from "data/ProjectData";
import styles from "./DeviceDisplay.module.scss";

type DeviceType = "phone" | "tablet" | "desktop";

interface DeviceDisplayProps {
  deviceType: DeviceType;
  id: string;
  mobileOrientation?: MobileOrientation;
}

/**
 * Display screenshots overlaid onto device images.
 * For use in the project carousels.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const DeviceDisplay: React.FC<DeviceDisplayProps> = ({
  deviceType,
  id,
  mobileOrientation,
}) => {
  const getElement = () => {
    const src = `/images/project-shots/${id}-${deviceType}.jpg`;
    if (deviceType === "desktop") {
      return (
        <div
          className={`${styles["full-project-desktop-shot"]} ${styles["shot"]}`}
        >
          <img
            className={styles["full-project-desktop-cap"]}
            src={src}
            alt=""
          />
        </div>
      );
    } else {
      return (
        <div
          className={`
            ${styles["full-project-mobile-shot"]} 
            ${styles["shot"]} 
            ${mobileOrientation ? styles[mobileOrientation] : ""}
          `.trim()}
        >
          <img className={styles["full-project-mobile-cap"]} src={src} alt="" />
        </div>
      );
    }
  };

  return (
    <div className={`${styles["project-shot"]} ${styles[id]}`}>
      {getElement()}
    </div>
  );
};

export default DeviceDisplay;
