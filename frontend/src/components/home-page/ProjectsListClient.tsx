"use client";

import React, { useState, useEffect } from "react";

import ProjectThumbnail from "@/components/home-page/ProjectThumbnail";
import { ParsedPortfolioProject } from "@/data/ProjectData";
import { useSequentialRowScrollFocus } from "@/hooks/useSequentialRowScrollFocus";
import { useAppSelector } from "@/store/hooks";

import styles from "./ProjectsListClient.module.scss";

interface ProjectsListClientProps {
  /**
   * Full set of projects to render in the grid. Includes both
   * public (non-NDA) and NDA entries. Public items render as
   * thumbnails; NDA items can be rendered as placeholders or
   * with alternate messaging/links.
   */
  allProjects: ParsedPortfolioProject[];
  isAuthenticated: boolean;
}

/**
 * Client-side portfolio projects list component.
 *
 * Receives server-rendered project data and implements client-only interactivity:
 * - Scroll-based focus highlighting (touch devices only) via `useSequentialRowScrollFocus`.
 * - Post-login state synchronization with Redux auth store.
 * - Responsive grid rendering with NDA-aware thumbnail display.
 *
 * Interaction model:
 * - Scroll focus provides visual feedback on touch devices, highlighting the thumbnail
 *   nearest the viewport center with left→right progression within rows.
 * - Hover-capable devices rely on CSS :hover states; scroll logic is disabled.
 * - NDA projects render with authentication-gated content and routing.
 *
 * @param props - Component properties.
 * @returns JSX element containing the projects grid.
 */
const ProjectsListClient: React.FC<ProjectsListClientProps> = ({
  allProjects,
  isAuthenticated,
}) => {
  // Merge server and client auth states (server-side for SSR, client-side for post-login).
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  const _clientAuth = isLoggedIn || !!user;

  // Maintain local project list; sync with server props on change (e.g., after router.refresh).
  const [projects, setProjects] =
    useState<ParsedPortfolioProject[]>(allProjects);
  useEffect(() => {
    setProjects(allProjects);
  }, [allProjects]);

  // Centralized scroll focus logic for touch devices (hover-capable devices use CSS).
  const { focusedIndex, setItemRef } = useSequentialRowScrollFocus(
    projects.length,
  );

  return (
    <div
      id="projects-list"
      className={styles.projectsList}
      data-nav="projects-list"
    >
      {projects.length === 0 && (
        <div aria-live="polite" style={{ opacity: 0.7 }}>
          No projects to display yet.
        </div>
      )}
      {projects.map((projectData, index) => {
        const id = projectData.id;
        const {
          title,
          omitFromList,
          brandId,
          brandLogoLightUrl,
          brandLogoDarkUrl,
          brandIsNda,
          nda,
          thumbUrl,
        } = projectData;

        return (
          <ProjectThumbnail
            key={id}
            index={index}
            omitFromList={omitFromList}
            projectId={id}
            title={title}
            brandId={brandId}
            brandLogoLightUrl={brandLogoLightUrl}
            brandLogoDarkUrl={brandLogoDarkUrl}
            brandIsNda={brandIsNda}
            nda={nda}
            thumbUrl={thumbUrl}
            isAuthenticated={isAuthenticated || _clientAuth}
            focused={focusedIndex === index}
            setRef={(el) => setItemRef(el, index)}
          />
        );
      })}
    </div>
  );
};

export default ProjectsListClient;
