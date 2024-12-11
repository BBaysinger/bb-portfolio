import React, { CSSProperties } from "react";

import "./ScreenShot.scss";

interface ScreenShotProps {
  showMobile: boolean;
  id: string;
  mobileOrientation?: string;
  loadImages: boolean;
}

/**
 * "Shot" as in screenshots. This is a component to display screenshots
 * within device images in the device details pages.
 *
 * TODO: Noticing on this iteration that the screen shots are not preloading on
 * iOS Safari. This may have started when I switched to using translateX over left property.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class ScreenShot extends React.Component<ScreenShotProps> {
  /**
   *
   *
   * @static
   * @memberof ScreenShot
   */
  static INIT = "init";

  /**
   *
   *
   * @static
   * @memberof ScreenShot
   */
  static RESET = "reset";

  /**
   *
   *
   * @static
   * @memberof ScreenShot
   */
  static TRANS_OUT = "trans_out";

  /**
   *
   *
   * @static
   * @memberof ScreenShot
   */
  static TRANS_IN = "trans_in";

  /**
   *
   *
   * @memberof ScreenShot
   */
  timesUpdated = 0;

  /**
   * Should only update for the initial render, or once after the initial screenshots have loaded for
   * first portfolio item the user has linked to. This makes sure the user sees the first two
   * as quickly as possible, before the rest start loading.
   *
   * @param {*} newProps
   * @returns
   * @memberof ScreenShot
   */
  shouldComponentUpdate(newProps: ScreenShotProps) {
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
   * @memberof ScreenShot
   */
  getDesktopImage = (src: string) => {
    if (this.props.loadImages) {
      return <img className="full_piece_desktop_cap" src={src} alt="" />;
    } else {
      return null;
    }
  };

  /**
   *
   *
   * @memberof ScreenShot
   */
  getMobileImage = (src: string) => {
    if (this.props.loadImages) {
      return <img className="full_piece_mobile_cap" src={src} alt="" />;
    } else {
      return null;
    }
  };

  /**
   *
   *
   * @returns
   * @memberof ScreenShot
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
      <div className={"piece_shot " + this.props.id}>
        <div className={"full_piece_desktop_shot shot"}>
          {this.getDesktopImage(desktopSrc)}
        </div>
        <div
          className={"full_piece_mobile_shot shot " + mobileOrientation}
          style={mobileDeviceStyle}
        >
          {this.getMobileImage(mobileSrc)}
        </div>
      </div>
    );
  }
}
