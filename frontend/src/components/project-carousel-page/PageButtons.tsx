"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React from "react";

import ProjectData from "@/data/ProjectData";

import styles from "./PageButtons.module.scss";

/**
 * PageButtons component
 *
 * Responsive navigation buttons for the project carousel.
 * These buttons appear on the left and right edges of the page and allow users
 * to navigate to the previous or next project in the portfolio view by updating
 * the `project` query parameter.
 *
 * The active project ID is pulled from the URL via `useSearchParams()`, and
 * the appropriate next/previous IDs are calculated using the `ProjectData` utility.
 *
 * Button clicks trigger shallow route changes without scrolling the page,
 * preserving scroll position and animation state across transitions.
 *
 * @component
 * @returns {JSX.Element} Left/right navigation controls for the project view.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
const PageButtons: React.FC = () => {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project") ?? "";

  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);

  return (
    <div className={styles.projectNav}>
      <Link
        href={`/project-view?project=${prevId}`}
        scroll={false}
        className={`${styles.navButton} ${styles.prev}`}
      >
        <div className={styles.inner}></div>
      </Link>
      <Link
        href={`/project-view?project=${nextId}`}
        scroll={false}
        className={`${styles.navButton} ${styles.next}`}
      >
        <div className={styles.inner}></div>
      </Link>
    </div>
  );
};

export default PageButtons;
