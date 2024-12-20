import React from "react";
import { Link, useParams } from "react-router-dom";

import blankPNG from "images/misc/blank.png";
import ProjectData from "data/ProjectData";
import styles from "./NavButtons.module.scss";

const LogoSwapper: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);

  return (
    <div id="logoSwapper" className={`${styles["nav-buttons"]}`}>
      <div id={styles.projectNav}>
        <Link
          to={`/portfolio/${prevId}`}
          className={`${styles["nav-button"]} ${styles.prev}`}
        >
          <img src={blankPNG} alt="Previous" />
        </Link>
        <Link
          to={`/portfolio/${nextId}`}
          className={`${styles["nav-button"]} ${styles.next}`}
        >
          <img src={blankPNG} alt="Next" />
        </Link>
      </div>
    </div>
  );
};

export default LogoSwapper;
