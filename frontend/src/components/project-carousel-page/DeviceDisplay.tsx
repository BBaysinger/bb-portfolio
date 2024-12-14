import React from "react";

import { MobileOrientation } from "data/ProjectData";
import styles from "./DeviceDisplay.module.scss";

// Define constants for DeviceTypes (Not used in the data.)
export const DeviceTypes = {
  LAPTOP: "laptop",
  PHONE: "phone",
} as const;

export type DeviceType = (typeof DeviceTypes)[keyof typeof DeviceTypes];

interface DeviceDisplayProps {
  deviceType: DeviceType;
  id: string;
  mobileOrientation?: MobileOrientation;
}

/**
 * Display screenshots overlaid onto device images.
 * For use in the project presentation carousels.
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
  const src = `/images/screencaps/${id}-${deviceType}.jpg`;

  console.log(mobileOrientation);

  return (
    <div className={`${styles["device-presentation"]} bb-device-presentation`}>
      {deviceType === DeviceTypes.LAPTOP ? (
        <div
          className={`${styles[DeviceTypes.LAPTOP]} ${styles["background-wrapper"]}`}
        >
          <img
            src={src}
            alt={`${id} screenshot`}
            loading="lazy"
            className={styles["screencap"]}
          />
        </div>
      ) : deviceType === DeviceTypes.PHONE ? (
        <div
          className={`
            ${styles[DeviceTypes.PHONE]} 
            ${styles["background-wrapper"]} 
            ${mobileOrientation ? styles[mobileOrientation] : ""}
          `.trim()}
        >
          <img
            src={src}
            alt={`${id} screenshot`}
            loading="lazy"
            className={styles["screencap"]}
          />
        </div>
      ) : null}
    </div>
  );
};

export default DeviceDisplay;
