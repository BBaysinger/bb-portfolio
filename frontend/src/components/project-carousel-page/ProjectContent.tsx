import { useState, useEffect, forwardRef } from "react";

import { ParsedPortfolioProject } from "data/ProjectData";
import styles from "./ProjectContent.module.scss";

interface ProjectContentProps {
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
const ProjectContent = forwardRef<HTMLDivElement, ProjectContentProps>(
  ({ dataNode, isActive }, ref) => {
    const { desc, urls, role } = dataNode;
    const [delayedActive, setDelayedActive] = useState(false);

    useEffect(() => {
      if (isActive) {
        const timeout = setTimeout(() => setDelayedActive(true), 500); // Adjust delay time as needed
        return () => clearTimeout(timeout); // Cleanup timeout
      } else {
        setDelayedActive(false);
      }
    }, [isActive]);

    return (
      <div
        ref={ref}
        id={styles.projectInfoAndFeatures}
        className={
          `${styles["project-info-and-features"]} ` +
          `${delayedActive ? styles["active"] : ""}`
        }
      >
        {desc.map((htmlContent, index) => (
          <div key={index} dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ))}
        {role && (
          <div>
            <p>
              <span style={{ fontWeight: "bold" }}>Role:</span> {role}
            </p>
          </div>
        )}
        <div className={styles["url-btns"]}>
          {Object.entries(urls).map(([label, urls]) => {
            if (Array.isArray(urls)) {
              return (
                <span className={"btn-group"} key={label}>
                  <span className={"btn btn-group-label"}>{label}</span>
                  {urls.map((item, index) => (
                    <a
                      key={item}
                      href={item}
                      className={styles.btn}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {index + 1}
                    </a>
                  ))}
                </span>
              );
            } else if (typeof urls === "string") {
              return (
                <a
                  className={"btn"}
                  href={urls}
                  key={urls}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {label}
                </a>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  },
);

export default ProjectContent;
