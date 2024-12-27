import React from "react";
import { Link, useParams } from "react-router-dom";

import ProjectData from "data/ProjectData";
import styles from "./PageButtons.module.scss";

const PageButtons: React.FC = () => {
  const { projectId = "" } = useParams<{ projectId: string }>();

  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);

  return (
    <div className={styles["project-nav"]}>
      <Link
        to={`/portfolio/${prevId}`}
        className={`${styles["nav-button"]} ${styles.prev}`}
      >
        <div className={styles["inner"]}></div>
      </Link>
      <Link
        to={`/portfolio/${nextId}`}
        className={`${styles["nav-button"]} ${styles.next}`}
      >
        <div className={styles["inner"]}></div>
      </Link>
    </div>
  );
};

export default PageButtons;