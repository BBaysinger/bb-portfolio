"use client";

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
 */
/**
 * Routing model notes (do not remove):
 * - Canonical entry from the list uses segment URLs: /project/{slug} or /nda/{slug}.
 * - In-session navigation (carousel gestures and these prev/next buttons) MUST use
 *   query-string routes: /project/?p={slug} or /nda/?p={slug}.
 *   This keeps SPA behavior stable and avoids segment churn while interacting.
 * - The ProjectView will canonicalize an initial segment entry to ?p= on first stabilization
 *   and dispatch a bb:routechange so listeners update consistently.
 */
const PageButtons: React.FC<{ projectId: string }> = ({ projectId }) => {
  // Ensure ProjectData is available and project exists
  const activeProjects = ProjectData.activeProjectsRecord;
  const hasValidProject =
    projectId && activeProjects && activeProjects[projectId];

  if (!hasValidProject) {
    // Return empty nav during loading or for invalid projects
    return <div className={styles.projectNav}></div>;
  }

  const prevId = ProjectData.prevKey(projectId);
  const nextId = ProjectData.nextKey(projectId);
  const prevIsNda = !!activeProjects[prevId]?.nda;
  const nextIsNda = !!activeProjects[nextId]?.nda;
  // In-session carousel navigation must use query-string model (see routing notes above)
  const prevHref = `${prevIsNda ? "/nda/" : "/project/"}?p=${encodeURIComponent(prevId)}`;
  const nextHref = `${nextIsNda ? "/nda/" : "/project/"}?p=${encodeURIComponent(nextId)}`;

  return (
    <div className={styles.projectNav}>
      <PushStateLink
        href={prevHref}
        className={`${styles.navButton} ${styles.prev}`}
      >
        <div className={styles.inner}></div>
      </PushStateLink>
      <PushStateLink
        href={nextHref}
        className={`${styles.navButton} ${styles.next}`}
      >
        <div className={styles.inner}></div>
      </PushStateLink>
    </div>
  );
};

export default PageButtons;
