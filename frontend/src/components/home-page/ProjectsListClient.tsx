"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  RefObject,
} from "react";

import ProjectThumbnail from "@/components/home-page/ProjectThumbnail";
import { ParsedPortfolioProject } from "@/data/ProjectData";

import styles from "./ProjectsListClient.module.scss";

interface ProjectsListClientProps {
  /**
   * Full set of projects to render in the grid. Includes both
   * public (non-NDA) and NDA entries. Public items render as
   * thumbnails; NDA items can be rendered as placeholders or
   * with alternate messaging/links.
   */
  allProjects: ParsedPortfolioProject[];
}

/**
 * Client component: ProjectsListClient
 *
 * Responsibilities
 * - Receives `allProjects` data from the server component (SSG/SSR).
 * - Implements all client-only interactivity (hover effects, scroll focus,
 *   and responsive behaviors) using React hooks and DOM APIs.
 * - Renders public projects using `ProjectThumbnail` and can render NDA
 *   entries as placeholders if desired. Currently, NDA-specific UI should be
 *   handled by the caller or via future conditional UI here.
 *
 * Interaction model
 * - Scroll-based focus logic highlights the thumbnail closest to the viewport
 *   center, providing a smooth browsing experience on touch devices.
 * - Hover-capable devices benefit from CSS/hover interactions; scroll logic
 *   remains a progressive enhancement.
 */
const ProjectsListClient: React.FC<ProjectsListClientProps> = ({
  allProjects,
}) => {
  const [focusedThumbIndex, setFocusedThumbIndex] = useState(-1);
  const projectThumbRefs = useRef<Array<RefObject<HTMLDivElement | null>>>([]);
  const ticking = useRef(false);

  /**
   * Initializes a reference to a DOM node for a thumbnail.
   * Ensures each thumbnail has a corresponding ref stored in `projectThumbRefs`.
   */
  const setThumbRef = useCallback(
    (node: HTMLDivElement | null, index: number) => {
      if (!projectThumbRefs.current[index]) {
        projectThumbRefs.current[index] = React.createRef<HTMLDivElement>();
      }
      projectThumbRefs.current[index].current = node;
    },
    [],
  );

  const getThumbnailIndex = (
    thumbRef: RefObject<HTMLDivElement | null>,
  ): number => {
    return projectThumbRefs.current.findIndex((ref) => ref === thumbRef);
  };

  const update = useCallback(
    (_: Event) => {
      if (typeof window === "undefined") return;

      let offset, absOffset, bounding, linkHeight, targetMaxOffset;
      const inRange: Array<RefObject<HTMLDivElement | null>> = [];

      projectThumbRefs.current.forEach((thumbRef) => {
        const domNode = thumbRef.current;
        if (domNode) {
          bounding = domNode.getBoundingClientRect();
          linkHeight = domNode.offsetHeight;
          targetMaxOffset = linkHeight / 2;
          offset = window.innerHeight / 2 - (bounding.top + targetMaxOffset);
          absOffset = Math.abs(offset);

          if (absOffset < targetMaxOffset) {
            inRange.push(thumbRef);
          }
          // When thumbnails wrap into rows, progressively determine focus
          // from left-to-right as the user scrolls forward (and reverse when
          // scrolling upward). This approximates a grid-aware focus heuristic.
        }
      });

      inRange.forEach((thumbRef, index) => {
        const domNode = thumbRef.current;
        if (domNode) {
          bounding = domNode.getBoundingClientRect();
          linkHeight = domNode.offsetHeight / inRange.length;

          const top = bounding.top + linkHeight * index;
          targetMaxOffset = linkHeight / 2;
          offset = window.innerHeight / 2 - (top + targetMaxOffset);
          absOffset = Math.abs(offset);

          if (absOffset < targetMaxOffset) {
            const newIndex = getThumbnailIndex(thumbRef);
            if (focusedThumbIndex !== newIndex) {
              setFocusedThumbIndex(newIndex);
            }
          }
        }
      });
    },
    [focusedThumbIndex],
  );

  /** Get the index of a given thumbnail ref from `projectThumbRefs`. */
  const handleScrollOrResize = useCallback(
    (e: Event) => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          update(e);
          ticking.current = false;
        });
        ticking.current = true;
      }
    },
    [update],
  );

  /** Bind/unbind scroll and resize listeners for focus updates. */
  useEffect(() => {
    document.addEventListener("scroll", handleScrollOrResize);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [handleScrollOrResize]);

  return (
    <div
      id="projects-list"
      className={styles.projectsList}
      data-nav="projects-list"
    >
      {allProjects.length === 0 && (
        <div aria-live="polite" style={{ opacity: 0.7 }}>
          No projects to display yet.
        </div>
      )}
      {allProjects.map((projectData, index) => {
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
          thumbAlt,
        } = projectData;

        return (
          <ProjectThumbnail
            focused={focusedThumbIndex === index}
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
            thumbAlt={thumbAlt}
            ref={(node) => setThumbRef(node, index)}
          />
        );
      })}
    </div>
  );
};

export default ProjectsListClient;
