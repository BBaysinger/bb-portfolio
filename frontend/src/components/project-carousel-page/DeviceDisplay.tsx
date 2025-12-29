import React from "react";

import { RawImg } from "@/components/common/RawImg";
import { MobileOrientation } from "@/data/ProjectData";
import ProjectData from "@/data/ProjectData";
import { useProjectDataVersion } from "@/hooks/useProjectDataVersion";

import { DeviceTypes, DeviceType } from "./DeviceDisplay.constants";
import styles from "./DeviceDisplay.module.scss";

interface DeviceDisplayProps {
  deviceType: DeviceType;
  id: string;
  mobileOrientation?: MobileOrientation;
  loading?: "eager" | "lazy";
  /**
   * If false, the real screenshot URL will not be assigned to <img src> yet.
   * This gives deterministic control over when network requests start.
   */
  shouldLoad?: boolean;

  /** Fires when the real screenshot (not placeholder) finishes loading. */
  onScreenshotLoad?: () => void;
}

/**
 * Display screenshots overlaid onto device images.
 * For use in the project presentation carousels.
 *
 * TODO: Handle preloading of images better.
 *
 */
const DeviceDisplay: React.FC<DeviceDisplayProps> = React.memo(
  ({
    deviceType,
    id,
    mobileOrientation,
    loading = "lazy",
    shouldLoad = true,
    onScreenshotLoad,
  }) => {
    // Re-render when ProjectData changes (e.g., NDA placeholder → real URLs)
    useProjectDataVersion();

    // Strictly use URLs from Payload uploads; if missing, render a transparent placeholder
    const payloadUrl =
      ProjectData.activeProjectsRecord[id]?.screenshotUrls?.[deviceType];
    const placeholderSrc = "/images/common/transparent-1x1.gif";

    const src = shouldLoad && payloadUrl ? payloadUrl : placeholderSrc;

    const handleImgLoad = () => {
      if (src === placeholderSrc) return;
      onScreenshotLoad?.();
    };

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
              loading={loading}
              onLoad={handleImgLoad}
              className={styles.screenshot}
            />
          </div>
        ) : deviceType === DeviceTypes.PHONE ? (
          <div
            className={`bbPhone ${styles.backgroundWrapper} ${styles[deviceType]}`}
          >
            <div
              className={
                `${styles.phoneFrame} ${mobileOrientation ? styles[mobileOrientation] : ""}` +
                ` bb${mobileOrientation ? mobileOrientation : ""}`
              }
            >
              <RawImg
                src={src}
                alt={id}
                loading={loading}
                onLoad={handleImgLoad}
                className={styles.screen}
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);

DeviceDisplay.displayName = "DeviceDisplay";

export default DeviceDisplay;
