"use client";

import { useParams } from "next/navigation";
import React from "react";

import { PushStateLink } from "@/components/common/PushStateLink";
import ProjectData from "@/data/ProjectData";

import styles from "./PageButtons.module.scss";

/**
 * Navigation buttons to switch between projects in the portfolio view.
 * Uses manual pushState routing to avoid full rerenders or scroll resets.
 *
 * This component reads the current `projectId` from the route segment using `useParams()`,
 * and uses `ProjectData` helpers to determine the next and previous project IDs.
 *
 * Replaces traditional <Link> with <PushStateLink> to maintain animation and scroll state.
 *
 * @component
 * @returns {JSX.Element} Prev/Next navigation buttons.
 *
 * @author Bradley Baysinger
 * @since 2025
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
      <PushStateLink
        href={`/project-view/${prevId}`}
        className={`${styles.navButton} ${styles.prev}`}
      >
        <div className={styles.inner}></div>
      </PushStateLink>
      <PushStateLink
        href={`/project-view/${nextId}`}
        className={`${styles.navButton} ${styles.next}`}
      >
        <div className={styles.inner}></div>
      </PushStateLink>
    </div>
  );
};

export default PageButtons;
