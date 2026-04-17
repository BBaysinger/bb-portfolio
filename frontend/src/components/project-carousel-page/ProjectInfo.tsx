import clsx from "clsx";
import { forwardRef, useMemo } from "react";

import { ParsedPortfolioProject, projectRequiresNda } from "@/data/ProjectData";

import { DirectionType } from "./carousel-core/CarouselTypes";
import styles from "./ProjectInfo.module.scss";

interface ProjectInfoProps {
  transition: string;
  dataNode: ParsedPortfolioProject;
  isActive: boolean;
  direction?: DirectionType;
}

/**
 * Display and animate the descriptions, features, and urls/buttons of each portfolio item.
 *
 */
const ProjectInfo = forwardRef<HTMLDivElement, ProjectInfoProps>(
  ({ dataNode, isActive, direction }, ref) => {
    const { desc, urls, role, longTitle, title } = dataNode;
    let globalIndex = 0;

    // Defense-in-depth: never render confidential NDA details unless the backend
    // actually provided them. When unauthenticated, the backend scrubs NDA fields
    // and we emit `isSanitized` placeholders.
    const shouldHideNdaDetails = useMemo(() => {
      try {
        if (!projectRequiresNda(dataNode)) return false;
        return Boolean(dataNode.isSanitized);
      } catch {
        return true;
      }
    }, [dataNode]);

    const displayTitle = useMemo(() => {
      if (shouldHideNdaDetails) return "Confidential project";
      return typeof longTitle === "string" && longTitle.trim()
        ? longTitle.trim()
        : title;
    }, [longTitle, title, shouldHideNdaDetails]);

    const safeDesc = shouldHideNdaDetails ? [] : desc;
    const safeUrls = shouldHideNdaDetails ? ({} as typeof urls) : urls;
    const safeRole = shouldHideNdaDetails ? undefined : role;

    return (
      <div
        ref={ref}
        className={clsx(
          styles.projectInfo,
          isActive && styles.active,
          direction && styles[direction.toLowerCase()],
        )}
        style={{ display: isActive ? "block" : "none" }}
      >
        {/* {direction && <div className={styles.direction}>{direction}</div>} */}
        <div
          className={styles.projectTitle}
          style={{ "--index": globalIndex++ } as React.CSSProperties}
        >
          <strong>Project Title</strong>: {displayTitle}
        </div>
        {safeDesc.map((htmlContent) => (
          <div
            key={globalIndex}
            style={{ "--index": globalIndex++ } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ))}
        {safeRole && (
          <div style={{ "--index": globalIndex++ } as React.CSSProperties}>
            <span style={{ fontWeight: "bold" }}>Role:</span> {safeRole}
          </div>
        )}
        {Object.entries(safeUrls).map(([label, urls]) => {
          if (Array.isArray(urls)) {
            return (
              <span
                className={clsx(styles.btnGroup, "btnGroup")}
                key={label}
                style={{ "--index": globalIndex++ } as React.CSSProperties}
              >
                <span
                  className={clsx(
                    styles.btn,
                    styles.btnGroupLabel,
                    "btn",
                    "btnGroupLabel",
                  )}
                >
                  {label}
                </span>
                {urls.map((item) => (
                  <a
                    key={item}
                    href={item}
                    className={clsx(styles.btn, "btn")}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ "--index": globalIndex++ } as React.CSSProperties}
                  >
                    {item}
                  </a>
                ))}
              </span>
            );
          } else if (typeof urls === "string") {
            return (
              <a
                className={clsx(styles.btn, "btn")}
                href={urls}
                key={urls}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "--index": globalIndex++ } as React.CSSProperties}
              >
                {label}
              </a>
            );
          }
          return null;
        })}
      </div>
    );
  },
);

ProjectInfo.displayName = "ProjectInfo";

export default ProjectInfo;
