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
  // Prefer reading from the current URL when pushState navigation is used,
  // falling back to useParams for SSR/initial load.
  let projectId = typeof params?.projectId === "string" ? params.projectId : "";
  if (typeof window !== "undefined") {
    const segs = window.location.pathname.split("/").filter(Boolean);
    const last = segs.at(-1);
    const maybeId = last && last !== "project-view" ? last : segs.at(-2);
    if (maybeId) projectId = maybeId;
  }

  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);

  return (
    <div className={styles.projectNav}>
      <PushStateLink
        href={`/project-view/${prevId}/`}
        className={`${styles.navButton} ${styles.prev}`}
      >
        <div className={styles.inner}></div>
      </PushStateLink>
      <PushStateLink
        href={`/project-view/${nextId}/`}
        className={`${styles.navButton} ${styles.next}`}
      >
        <div className={styles.inner}></div>
      </PushStateLink>
    </div>
  );
};

export default PageButtons;
