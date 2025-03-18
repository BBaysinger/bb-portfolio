import React, { forwardRef } from "react";
import { Link } from "react-router-dom";

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
      backgroundImage: `url('/images/thumbs/${projectId}.webp')`,
    };

    const focusClass = focused ? styles["project-thumbnail-focus"] : "";

    return (
      <div className={`${styles["project-thumbnail"]} ${focusClass}`} ref={ref}>
        <Link to={`/portfolio/${projectId}#project`}>
          <div className={styles["thumb-bg"]} style={style}></div>
          <div className={styles["vignette"]}></div>
          <div className={styles["thumb-content"]}>
            <div>
              <img
                src={`/images/client-logos/${clientId}.svg`}
                className={styles["client-logo"]}
                loading="lazy"
                alt={`${clientId} logo`}
              />
            </div>
            <h4 className={styles["thumb-title"]}>{title}</h4>
          </div>
        </Link>
      </div>
    );
  },
);

export default ProjectThumbnail;
