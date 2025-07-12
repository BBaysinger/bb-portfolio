"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

import ProjectData from "@/data/ProjectData";

import styles from "./PageButtons.module.scss";

/**
 * Navigation buttons to switch between projects in the portfolio view.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const PageButtons: React.FC = () => {
  const params = useParams();
  const projectId =
    typeof params?.projectId === "string" ? params.projectId : "";

  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);

  return (
    <div className={styles.projectNav}>
      <Link
        href={`/portfolio/${prevId}`}
        className={`${styles.navButton} ${styles.prev}`}
      >
        <div className={styles.inner}></div>
      </Link>
      <Link
        href={`/portfolio/${nextId}`}
        className={`${styles.navButton} ${styles.next}`}
      >
        <div className={styles.inner}></div>
      </Link>
    </div>
  );
};

export default PageButtons;
