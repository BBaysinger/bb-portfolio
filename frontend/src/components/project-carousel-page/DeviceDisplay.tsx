import React from "react";

import { MobileStatus } from "data/ProjectData";
import styles from "./DeviceDisplay.module.scss";

// Define constants for DeviceTypes (not used in the data)
export const DeviceTypes = {
  LAPTOP: "laptop",
  PHONE: "phone",
} as const;

export type DeviceType = (typeof DeviceTypes)[keyof typeof DeviceTypes];

interface DeviceDisplayProps {
  deviceType: DeviceType;
  id: string;
  mobileStatus?: MobileStatus;
}

/**
 * Display screenshots overlaid onto device images.
 * For use in the project presentation carousels.
 *
 * TODO: Handle preloading of images better.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const DeviceDisplay: React.FC<DeviceDisplayProps> = React.memo(
  ({ deviceType, id, mobileStatus }) => {
    const src = `/images/screencaps/${id}-${deviceType}.jpg`;

    return (
      <div
        className={`${styles["device-presentation"]} ${styles[deviceType]} bb-device-presentation`}
      >
        {deviceType === DeviceTypes.LAPTOP ? (
          <div
            className={`bb-laptop ${styles["background-wrapper"]} ${styles[deviceType]}`}
          >
            <img
              src={src}
              alt={`${id} screencap`}
              loading="eager"
              className={styles["screencap"]}
            />
          </div>
        ) : deviceType === DeviceTypes.PHONE ? (
          <div
            className={
              `bb-phone ${styles["background-wrapper"]} ${mobileStatus ? styles[mobileStatus] : ""}` +
              ` bb-${mobileStatus ? mobileStatus : ""} ${styles[deviceType]}`
            }
          >
            <img
              src={src}
              alt={`${id} bb-screencap`}
              loading="eager"
              className={styles["screencap"]}
            />
          </div>
        ) : null}
      </div>
    );
  },
);

export default DeviceDisplay;
