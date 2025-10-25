"use client";

import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

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
  const params = useParams();
  const [clientProjectId, setClientProjectId] = useState<string>("");

  // SSR-safe: Start with params.projectId, update with window.location on client
  const baseProjectId =
    typeof params?.projectId === "string" ? params.projectId : "";
  const projectId = clientProjectId || baseProjectId;

  // Update projectId from URL on client side only, and listen for route changes
  useEffect(() => {
    const updateProjectId = () => {
      const segs = window.location.pathname.split("/").filter(Boolean);
      const last = segs.at(-1);
      const maybeId = last && last !== "project" ? last : segs.at(-2);
      if (maybeId && maybeId !== baseProjectId) {
        setClientProjectId(maybeId);
      }
    };

    // Initial update
    updateProjectId();
  }, [baseProjectId]);

  // Listen for route changes (pushState navigation, back/forward buttons)
  useRouteChange(() => {
    const segs = window.location.pathname.split("/").filter(Boolean);
    const last = segs.at(-1);
    const maybeId = last && last !== "project" ? last : segs.at(-2);
    const currentProjectId = clientProjectId || baseProjectId;

    // Update whenever the URL project ID differs from our current state
    if (maybeId && maybeId !== currentProjectId) {
      setClientProjectId(maybeId);
    }
  });

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

  return (
    <div className={styles.projectNav}>
      {/* Debug info - remove after fixing */}
      {/* {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "fixed",
            top: "100px",
            right: "10px",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "10px",
            borderRadius: "5px",
            fontSize: "12px",
            fontFamily: "monospace",
            zIndex: 9999,
            maxWidth: "300px",
          }}
        >
          <div>Current: {projectId}</div>
          <div>Index: {ProjectData.projectIndex(projectId)}</div>
          <div>Prev: {prevId}</div>
          <div>Next: {nextId}</div>
          <div>ActiveKeys: {ProjectData.activeKeys.length}</div>
          <div>InRecord: {!!activeProjects[projectId] ? "YES" : "NO"}</div>
        </div>
      )} */}

      <PushStateLink
        href={`/project/${prevId}/`}
        className={`${styles.navButton} ${styles.prev}`}
      >
        <div className={styles.inner}></div>
      </PushStateLink>
      <PushStateLink
        href={`/project/${nextId}/`}
        className={`${styles.navButton} ${styles.next}`}
      >
        <div className={styles.inner}></div>
      </PushStateLink>
    </div>
  );
};

export default PageButtons;
