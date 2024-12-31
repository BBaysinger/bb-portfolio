import { useRef, useEffect, ReactNode, forwardRef } from "react";

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
  ({ dataNode, isActive }) => {
    // const domElem = useRef<HTMLElement | null>(null);
    const members = useRef<HTMLElement[]>([]);

    useEffect(() => {
      return () => {
        members.current = [];
      };
    }, []);

    const { desc, urls, role } = dataNode;

    const urlBtns: ReactNode = Object.entries(urls).map(([label, urls]) => {
      if (Array.isArray(urls)) {
        return (
          <span
            className={"btn-group"}
            // ref={addMember}
            key={label}
          >
            <span className={"btn btn-group-label"}>{label}</span>
            {urls.map((item, index) => (
              <a key={item} href={item} className={styles.btn} target="_blank">
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
            // ref={addMember}
            key={urls}
            target="_blank"
          >
            {label}
          </a>
        );
      } else {
        throw new Error("Type must be string[] or string.");
      }
    });

    return (
      <div
        id={styles.projectInfoAndFeatures}
        className={
          `${styles["project-info-and-features"]} ` +
          `${isActive ? styles["active"] : ""}`
        }
      >
        {/* <div className={styles["desc-paragraphs"]}> */}
        {desc.map((htmlContent, index) => (
          <div
            key={index}
            // ref={addMember}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ))}
        {role && (
          <div
          // ref={addMember}
          >
            <p>
              <span style={{ fontWeight: "bold" }}>Role:</span> {role}
            </p>
          </div>
        )}
        {/* </div> */}
        <div className={styles["url-btns"]}>{urlBtns}</div>
      </div>
    );
  },
);

export default ProjectContent;
