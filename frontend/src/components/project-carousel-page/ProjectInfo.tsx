import clsx from "clsx";
import { forwardRef, useCallback, useMemo, useState } from "react";

import { ParsedPortfolioProject, projectRequiresNda } from "@/data/ProjectData";

import { DirectionType } from "./CarouselTypes";
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
    const { desc, urls, role } = dataNode;
    const [copied, setCopied] = useState(false);
    let globalIndex = 0;

    const canonicalPath = useMemo(() => {
      const base = projectRequiresNda(dataNode) ? "/nda/" : "/project/";
      return `${base}${encodeURIComponent(dataNode.id)}`;
    }, [dataNode]);

    const canonicalUrl = useMemo(() => {
      if (typeof window === "undefined") return canonicalPath;
      try {
        const origin = window.location.origin.replace(/\/$/, "");
        return `${origin}${canonicalPath}`;
      } catch {
        return canonicalPath;
      }
    }, [canonicalPath]);

    const handleCopyLink = useCallback(async () => {
      const text = canonicalUrl;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "absolute";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setCopied(true);
        if (typeof window !== "undefined") {
          window.setTimeout(() => setCopied(false), 2000);
        }
      } catch {
        // ignore copy failure
      }
    }, [canonicalUrl]);

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
        {direction && <div className={styles.direction}>{direction}</div>}
        {desc.map((htmlContent) => (
          <div
            key={globalIndex}
            style={{ "--index": globalIndex++ } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ))}
        {role && (
          <div style={{ "--index": globalIndex++ } as React.CSSProperties}>
            <span style={{ fontWeight: "bold" }}>Role:</span> {role}
          </div>
        )}
        {Object.entries(urls).map(([label, urls]) => {
          if (Array.isArray(urls)) {
            return (
              <span
                className={`${styles.btnGroup} btnGroup`}
                key={label}
                style={{ "--index": globalIndex++ } as React.CSSProperties}
              >
                <span
                  className={
                    `${styles.btn} ${styles.btnGroupLabel} ` +
                    `btn btnGroupLabel`
                  }
                >
                  {label}
                </span>
                {urls.map((item) => (
                  <a
                    key={item}
                    href={item}
                    className={`${styles.btn} btn`}
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
                className={`${styles.btn} btn`}
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
        {/* Copy Link button inline with other buttons */}
        <button
          type="button"
          onClick={handleCopyLink}
          className={`${styles.btn} ${styles.copyLinkBtn} btn`}
          aria-label="Copy canonical link to this project"
          style={{ "--index": globalIndex++ } as React.CSSProperties}
        >
          {copied ? "Link copied" : "🔗"}
        </button>
      </div>
    );
  },
);

ProjectInfo.displayName = "ProjectInfo";

export default ProjectInfo;
