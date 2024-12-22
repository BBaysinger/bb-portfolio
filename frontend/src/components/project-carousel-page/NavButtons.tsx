import React from "react";
import { Link, useParams } from "react-router-dom";

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
      </Link>
      <Link
        to={`/portfolio/${nextId}`}
        className={`${styles["nav-button"]} ${styles.next}`}
      >
      </Link>
    </div>
  );
};

export default NavButtons;
