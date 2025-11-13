"use client";

import React from "react";

import { PushStateLink } from "@/components/common/PushStateLink";
import ProjectData from "@/data/ProjectData";

import styles from "./PageButtons.module.scss";

/**
 * Project navigation buttons for carousel-style browsing
 * 
 * Provides prev/next navigation between projects in the portfolio carousel.
 * Uses custom PushStateLink components to maintain smooth transitions and
 * avoid full page reloads during navigation.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.projectId - Current project ID for context
 * 
 * @example
 * ```tsx
 * <PageButtons projectId="my-awesome-project" />
 * ```
 * 
 * Features:
 * - Seamless SPA navigation using pushState routing
 * - NDA-aware routing (switches between /project/ and /nda/ routes)
 * - Accessible navigation with ARIA labels and role grouping  
 * - Graceful handling of missing/invalid projects
 * - Maintains scroll position and animation state during navigation
 * 
 * Architecture:
 * - Integrates with ProjectData for next/prev project resolution
 * - Uses query-string routing (?p=slug) for in-session navigation
 * - Supports both public and NDA project collections
 * - Emits custom bb:routechange events for state synchronization
 * 
 * @see {@link PushStateLink} for the underlying navigation mechanism
 * @see {@link ProjectData} for project data and navigation helpers
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
    <div
      className={styles.projectNav}
      role="group"
      aria-label="Project navigation"
    >
      <PushStateLink
        href={prevHref}
        className={`${styles.navButton} ${styles.prev}`}
        aria-label={`Previous project: ${activeProjects[prevId]?.title || prevId}`}
      >
        <div className={styles.inner} aria-hidden="true"></div>
      </PushStateLink>
      <PushStateLink
        href={nextHref}
        className={`${styles.navButton} ${styles.next}`}
        aria-label={`Next project: ${activeProjects[nextId]?.title || nextId}`}
      >
        <div className={styles.inner} aria-hidden="true"></div>
      </PushStateLink>
    </div>
  );
};

export default PageButtons;
