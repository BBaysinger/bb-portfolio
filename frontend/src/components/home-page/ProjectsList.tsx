"use client";

import React, { useState, useEffect } from "react";

import Marquee from "@/components/home-page/Marquee";
import ProjectThumbnail from "@/components/home-page/ProjectThumbnail";
import { ParsedPortfolioProject } from "@/data/ProjectData";
import { useAppSelector } from "@/store/hooks";

import styles from "./ProjectsList.module.scss";

interface ProjectsListProps {
  /**
   * Full set of projects to render in the grid. Includes both
   * public (non-NDA) and NDA entries. Public items render as
   * thumbnails; NDA items can be rendered as placeholders or
   * with alternate messaging/links.
   */
  allProjects: ParsedPortfolioProject[];
  isAuthenticated: boolean;
  /**
   * Optional render prop for custom thumbnail rendering.
   */
  renderThumbnail?: (
    project: ParsedPortfolioProject,
    index: number,
    props: {
      isAuthenticated: boolean;
    },
  ) => React.ReactNode;
}

/**
 * Client-side portfolio projects list component.
 *
 * Renders a grid of portfolio project thumbnails with:
 * - Post-login state synchronization with Redux auth store.
 * - Responsive grid rendering with NDA-aware thumbnail display.
 * - CSS :hover states for interactive feedback.
 * - NDA projects with authentication-gated content and routing.
 *
 * Note: Previously this grid swapped to an experimental magnifier layout on
 * touch devices. That experiment has been retired and the standard grid now
 * renders universally.
 *
 * @param props - Component properties.
 * @returns JSX element containing the projects grid.
 */
const ProjectsList: React.FC<ProjectsListProps> & {
  ProjectThumbnail: typeof ProjectThumbnail;
} = ({ allProjects, isAuthenticated, renderThumbnail }) => {
  // Merge server and client auth states (server-side for SSR, client-side for post-login).
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  const _clientAuth = isLoggedIn || !!user;

  // Maintain local project list; sync with server props on change (e.g., after router.refresh).
  const [projects, setProjects] =
    useState<ParsedPortfolioProject[]>(allProjects);
  useEffect(() => {
    setProjects(allProjects);
  }, [allProjects]);

  const marqueePhrases = React.useMemo(
    () => ["Selected Works 2013-Present"],
    [],
  );

  return (
    <div
      id="projects-list"
      className={styles.projectsList}
      data-nav="projects-list"
    >
      <Marquee phrases={marqueePhrases} />
      {projects.length === 0 && (
        <div aria-live="polite" style={{ opacity: 0.7 }}>
          No projects to display yet.
        </div>
      )}
      {projects.map((projectData, index) => {
        const id = projectData.id;
        const auth = isAuthenticated || _clientAuth;
        if (renderThumbnail) {
          return renderThumbnail(projectData, index, {
            isAuthenticated: auth,
          });
        }
        const {
          title,
          omitFromList,
          brandId,
          brandLogoLightUrl,
          brandLogoDarkUrl,
          brandIsNda,
          nda,
          isSanitized,
          shortCode,
          thumbUrl,
          thumbAlt,
          lockedThumbUrl,
          lockedThumbAlt,
        } = projectData;
        return (
          <ProjectThumbnail
            key={id}
            index={index}
            omitFromList={omitFromList}
            projectId={id}
            projectShortCode={shortCode}
            title={title}
            brandId={brandId}
            brandLogoLightUrl={brandLogoLightUrl}
            brandLogoDarkUrl={brandLogoDarkUrl}
            brandIsNda={brandIsNda}
            nda={nda}
            isSanitized={isSanitized}
            thumbUrl={thumbUrl}
            thumbAlt={thumbAlt}
            lockedThumbUrl={lockedThumbUrl}
            lockedThumbAlt={lockedThumbAlt}
            isAuthenticated={auth}
          />
        );
      })}
    </div>
  );
};

ProjectsList.ProjectThumbnail = ProjectThumbnail;
export default ProjectsList;
