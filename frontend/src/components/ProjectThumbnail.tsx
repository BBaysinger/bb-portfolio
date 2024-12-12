import React, { createRef } from "react";
import { Link } from "react-router-dom";

import HoverCapabilityWatcher from "utils/HoverCapabilityWatcher";
import styles from "./ProjectThumbnail.module.scss";

interface ProjectThumbnailProps {
  focused: boolean;
  key: string;
  index: number;
  omitFromList: boolean;
  projectId: string;
  title: string;
  clientId: string;
}

/**
 * The thumbnails in the portfolio/home that each link out to a specific
 * portfolio project via dynamic routing.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class ProjectThumbnail extends React.Component<ProjectThumbnailProps> {
  private divRef = createRef<HTMLDivElement>();

  getDOMNode() {
    return this.divRef.current;
  }

  /**
   *
   *
   * @returns
   * @memberof ProjectThumbnail
   */
  render() {
    const { projectId, title, clientId } = this.props;

    const style: React.CSSProperties = {
      backgroundImage: "url('/images/thumbs/" + projectId + ".jpg')",
    };

    const focus = this.props.focused ? styles["project-thumbnail-focus"] : "";
    const hoverEnabled = HoverCapabilityWatcher.instance.isHoverCapable
      ? styles["hover-enabled"]
      : "";

    return (
      <div
        className={`${styles["project-thumbnail"]} ${focus} ${hoverEnabled}`}
        style={style}
        ref={this.divRef}
      >
        <Link to={`/portfolio/${projectId}#project`}>
          <div className={styles["vingette"]}></div>
          <div className={styles["thumb-content"]}>
            <img
              src={"/images/client-logos/" + clientId + ".svg"}
              className={styles["client-logo"]}
              alt={clientId + " logo"}
            />
            <h4 className={styles["thumb-title"]}>{title}</h4>
          </div>
        </Link>
      </div>
    );
  }
}
