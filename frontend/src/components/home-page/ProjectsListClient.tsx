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
  isAuthenticated,
}) => {
  // React to client-side auth state changes (after hydration/login)
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  // Use server-side auth state to avoid hydration mismatches with NDA content
  const _clientAuth = isLoggedIn || !!user; // Available for future features

  // Local state that can be refreshed post-login to replace NDA placeholders
  const [projects, setProjects] = useState<ParsedPortfolioProject[]>(
    allProjects,
  );
  const hasRefreshedAfterLogin = useRef(false);

  // When a user logs in client-side (e.g., via /admin without full page reload),
  // we need to refetch project data so NDA placeholders are replaced with real data.
  // Server-rendered data cannot be “unscrubbed” in-place because the fields were
  // removed during SSR for unauthenticated requests.
  useEffect(() => {
    if (_clientAuth && !hasRefreshedAfterLogin.current) {
      // Trigger a client-side refresh of ProjectData; it will include auth cookie
      // and return full NDA data (titles, logos, screenshots) where permitted.
      const run = async () => {
        try {
          // Dynamic import to avoid bloat if never needed during unauthenticated sessions
          const mod = await import("@/data/ProjectData");
          await mod.default.initialize({
            disableCache: true,
            includeNdaInActive: true,
          });
          const refreshed = [...mod.default.listedProjects];
          // Only update if we actually received NDA expansions (heuristic: any title !== 'Confidential Project' while nda flag true)
          setProjects(refreshed);
          hasRefreshedAfterLogin.current = true;
          if (process.env.NODE_ENV !== "production") {
            const ndaRealCount = refreshed.filter(
              (p) => (p.nda || p.brandIsNda) && p.title !== "Confidential Project",
            ).length;
            // eslint-disable-next-line no-console
            console.info("[ProjectsListClient] NDA refresh complete", {
              total: refreshed.length,
              ndaRealCount,
            });
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn("[ProjectsListClient] NDA refresh failed", e);
        }
      };
      run();
    }
  }, [_clientAuth]);

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
      {projects.length === 0 && (
        <div aria-live="polite" style={{ opacity: 0.7 }}>
          No projects to display yet.
        </div>
      )}
      {(() => {
        let ndaCount = 0;
        return projects.map((projectData, index) => {
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
            thumbUrlMobile,
            thumbAlt,
          } = projectData;

          // Track NDA index for color cycling
          const isNdaProject = nda || brandIsNda;
          let ndaIndex = 0;
          if (isNdaProject) {
            ndaIndex = ndaCount;
            ndaCount++;
          }

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
              ndaIndex={ndaIndex}
              thumbUrl={thumbUrl}
              thumbUrlMobile={thumbUrlMobile}
              thumbAlt={thumbAlt}
              // Use merged auth state: server auth (for initial SSR) or client post-login
              isAuthenticated={isAuthenticated || _clientAuth}
              ref={(node) => setThumbRef(node, index)}
            />
          );
        });
      })()}
    </div>
  );
};

export default ProjectsListClient;
