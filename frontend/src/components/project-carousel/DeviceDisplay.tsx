import React, { CSSProperties } from "react";

import "./DeviceDisplay.scss";

interface DeviceDisplayProps {
  showMobile: boolean;
  id: string;
  mobileOrientation?: string;
  loadImages: boolean;
}

/**
 * Display screenshots overlaid onto device images.
 * For use in the project carousels.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class DeviceDisplay extends React.Component<DeviceDisplayProps> {
  /**
   *
   *
   * @static
   * @memberof DeviceDisplay
   */
  static INIT = "init";

  /**
   *
   *
   * @static
   * @memberof DeviceDisplay
   */
  static RESET = "reset";

  /**
   *
   *
   * @static
   * @memberof DeviceDisplay
   */
  static TRANS_OUT = "trans_out";

  /**
   *
   *
   * @static
   * @memberof DeviceDisplay
   */
  static TRANS_IN = "trans_in";

  /**
   *
   *
   * @memberof DeviceDisplay
   */
  timesUpdated = 0;

  /**
   * Should only update for the initial render, or once after the initial screenshots have loaded for
   * first portfolio item the user has linked to. This makes sure the user sees the first two
   * as quickly as possible, before the rest start loading.
   *
   * @param {*} newProps
   * @returns
   * @memberof DeviceDisplay
   */
  shouldComponentUpdate(newProps: DeviceDisplayProps) {
    // HERE: https://medium.com/@User3141592/react-gotchas-and-best-practices-2d47fd67dd22
    this.timesUpdated++;

    if (
      this.timesUpdated === 1 ||
      (newProps.loadImages && !this.props.loadImages)
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   *
   *
   * @memberof DeviceDisplay
   */
  getDesktopImage = (src: string) => {
    if (this.props.loadImages) {
      return <img className="full_project_desktop_cap" src={src} alt="" />;
    } else {
      return null;
    }
  };

  /**
   *
   *
   * @memberof DeviceDisplay
   */
  getMobileImage = (src: string) => {
    if (this.props.loadImages) {
      return <img className="full_project_mobile_cap" src={src} alt="" />;
    } else {
      return null;
    }
  };

  /**
   *
   *
   * @returns
   * @memberof DeviceDisplay
   */
  render() {
    const imgDir = "/images/project_shots/";
    const mobileDeviceStyle: CSSProperties = this.props.showMobile
      ? { visibility: "visible" }
      : { visibility: "hidden" };

    const desktopSrc = imgDir + this.props.id + "_desktop.jpg";
    const mobileSrc = imgDir + this.props.id + "_mobile.jpg";
    const mobileOrientation = this.props.mobileOrientation;

    return (
      <div className={"project_shot " + this.props.id}>
        <div className={"full_project_desktop_shot shot"}>
          {this.getDesktopImage(desktopSrc)}
        </div>
        <div
          className={"full_project_mobile_shot shot " + mobileOrientation}
          style={mobileDeviceStyle}
        >
          {this.getMobileImage(mobileSrc)}
        </div>
      </div>
    );
  }
}
