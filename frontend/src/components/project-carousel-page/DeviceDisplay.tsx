import React from "react";

import { MobileStatus } from "@/data/ProjectData";

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
    const src = `/images/screenshots/${id}-${deviceType}.webp`;

    return (
      <div
        className={`${styles.devicePresentation} ${styles[deviceType]} bbDevicePresentation`}
      >
        {deviceType === DeviceTypes.LAPTOP ? (
          <div
            className={`bbLaptop ${styles.backgroundWrapper} ${styles[deviceType]}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={id}
              loading="eager"
              className={styles.screenshot}
            />
          </div>
        ) : deviceType === DeviceTypes.PHONE ? (
          <div
            className={
              `bbPhone ${styles.backgroundWrapper} ${mobileStatus ? styles[mobileStatus] : ""}` +
              ` bb${mobileStatus ? mobileStatus : ""} ${styles[deviceType]}`
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={id}
              loading="eager"
              className={styles.screenshot}
            />
          </div>
        ) : null}
      </div>
    );
  },
);

DeviceDisplay.displayName = "DeviceDisplay";

export default DeviceDisplay;
