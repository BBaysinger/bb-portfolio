import React from "react";

import { RawImg } from "@/components/common/RawImg";
import { MobileStatus } from "@/data/ProjectData";
import ProjectData from "@/data/ProjectData";

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
 * @since 2025
 * @version N/A
 */
const DeviceDisplay: React.FC<DeviceDisplayProps> = React.memo(
  ({ deviceType, id, mobileStatus }) => {
    // Strictly use URLs from Payload uploads; if missing, render a transparent placeholder
    const payloadUrl =
      ProjectData.activeProjectsRecord[id]?.screenshotUrls?.[deviceType];
    const src = payloadUrl || "/images/common/transparent-1x1.png";

    return (
      <div
        className={`${styles.devicePresentation} ${styles[deviceType]} bbDevicePresentation`}
      >
        {deviceType === DeviceTypes.LAPTOP ? (
          <div
            className={`bbLaptop ${styles.backgroundWrapper} ${styles[deviceType]}`}
          >
            <RawImg
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
            <RawImg
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
