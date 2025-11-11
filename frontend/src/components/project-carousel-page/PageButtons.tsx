"use client";

import { useSearchParams } from "next/navigation";
import React, { useState } from "react";

import { PushStateLink } from "@/components/common/PushStateLink";
import ProjectData from "@/data/ProjectData";
import { useRouteChange } from "@/hooks/useRouteChange";

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
const PageButtons: React.FC = () => {
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState<string>(
    searchParams.get("p") || "",
  );

  // Sync state when query string changes
  useRouteChange(
    (_pathname, search) => {
      const p = new URLSearchParams(search).get("p") || "";
      setProjectId(p);
    },
    { mode: "external-only" },
  );

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
  // Carousel navigation uses query routes on the base path to avoid segment churn
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
