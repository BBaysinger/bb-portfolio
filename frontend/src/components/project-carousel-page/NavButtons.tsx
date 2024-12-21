import React from "react";
import { Link, useParams } from "react-router-dom";

import blankPNG from "images/misc/blank.png";
import ProjectData from "data/ProjectData";
import styles from "./NavButtons.module.scss";

const NavButtons: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);

  return (
    <div className={styles["project-nav"]}>
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
  );
};

export default NavButtons;
