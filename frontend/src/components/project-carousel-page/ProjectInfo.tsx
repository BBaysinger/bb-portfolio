import { forwardRef } from "react";

import { ParsedPortfolioProject } from "data/ProjectData";
import styles from "./ProjectInfo.module.scss";

interface ProjectInfoProps {
  transition: string;
  dataNode: ParsedPortfolioProject;
  isActive: boolean;
}

/**
 * Display and animate the descriptions, features, and urls/buttons of each portfolio item.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const ProjectInfo = forwardRef<HTMLDivElement, ProjectInfoProps>(
  ({ dataNode, isActive }, ref) => {
    const { desc, urls, role } = dataNode;
    let globalIndex = 0;

    return (
      <div
        ref={ref}
        className={
          `${styles["project-info-and-features"]} ` +
          `${isActive ? styles["active"] : ""}`
        }
      >
        {desc.map((htmlContent) => (
          <p
            key={globalIndex}
            style={{ "--index": globalIndex++ } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ))}
        {role && (
          <p style={{ "--index": globalIndex++ } as React.CSSProperties}>
            <span style={{ fontWeight: "bold" }}>Role:</span> {role}
          </p>
        )}
        {Object.entries(urls).map(([label, urls]) => {
          if (Array.isArray(urls)) {
            return (
              <span
                className={`${styles["btn-group"]} btn-group`}
                key={label}
                style={{ "--index": globalIndex++ } as React.CSSProperties}
              >
                <span
                  className={
                    `${styles["btn"]} ${styles["btn-group-label"]} ` +
                    `btn btn-group-label`
                  }
                >
                  {label}
                </span>
                {urls.map((item) => (
                  <a
                    key={item}
                    href={item}
                    className={`${styles["btn"]} btn`}
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
                className={`${styles["btn"]} btn`}
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

export default ProjectInfo;
