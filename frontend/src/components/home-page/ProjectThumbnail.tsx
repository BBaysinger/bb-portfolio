import React, { forwardRef } from "react";
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
const ProjectThumbnail = forwardRef<HTMLDivElement, ProjectThumbnailProps>(
  ({ focused, projectId, title, clientId }, ref) => {
    const style: React.CSSProperties = {
      backgroundImage: `url('/images/thumbs/${projectId}.jpg')`,
    };

    const focusClass = focused ? styles["project-thumbnail-focus"] : "";
    const isHoverEnabledClass = () => {
      return HoverCapabilityWatcher.instance.isHoverCapable
        ? styles["hover-enabled"]
        : "";
    };

    return (
      <div
        className={`${styles["project-thumbnail"]} ${focusClass} ${isHoverEnabledClass()}`}
        style={style}
        ref={ref}
      >
        <Link to={`/portfolio/${projectId}#project`}>
          <div className={styles["vingette"]}></div>
          <div className={styles["thumb-content"]}>
            <img
              src={`/images/client-logos/${clientId}.svg`}
              className={styles["client-logo"]}
              alt={`${clientId} logo`}
            />
            <h4 className={styles["thumb-title"]}>{title}</h4>
          </div>
        </Link>
      </div>
    );
  },
);

export default ProjectThumbnail;
