import React from "react";
import { MobileStatus } from "data/ProjectData";
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
  mobileStatus?: MobileStatus;
}

/**
 * Display screenshots overlaid onto device images.
 * For use in the project presentation carousels.
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
        className={`${styles["device-presentation"]} bb-device-presentation`}
      >
        {deviceType === DeviceTypes.LAPTOP ? (
          <div
            className={`
              ${styles[DeviceTypes.LAPTOP]}
              bb-laptop
              ${styles["background-wrapper"]}`}
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
            className={`
              ${styles[DeviceTypes.PHONE]}
              bb-phone
              ${styles["background-wrapper"]} 
              ${mobileStatus ? styles[mobileStatus] : ""}
              bb-${mobileStatus ? mobileStatus : ""}
            `.trim()}
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
  (prevProps, nextProps) =>
    prevProps.deviceType === nextProps.deviceType &&
    prevProps.id === nextProps.id &&
    prevProps.mobileStatus === nextProps.mobileStatus,
);

export default DeviceDisplay;
