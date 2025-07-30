"use client";

import Image from "next/image";
import Link from "next/link";
import React, {
  forwardRef,
  useEffect,
  useState,
  type CSSProperties,
} from "react";

import styles from "./ProjectThumbnail.module.scss";

interface ProjectThumbnailProps {
  focused: boolean;
  index: number;
  omitFromList: boolean;
  projectId: string;
  title: string;
  brandId: string;
}

/**
 * Thumbnail component used on the homepage.
 * Each tile links to `/project-view?project=...` using client routing.
 * Brand logos are loaded during idle time to avoid blocking initial paint.
 *
 * @author Bradley Baysinger
 * @since 2025
 */
const ProjectThumbnail = forwardRef<HTMLDivElement, ProjectThumbnailProps>(
  ({ focused, projectId, title, brandId }, ref) => {
    const [logoSrc, setLogoSrc] = useState<string | null>(null);

    useEffect(() => {
      const loadLogo = () => {
        setLogoSrc(`/images/brand-logos/${brandId}.svg`);
      };

      if ("requestIdleCallback" in window) {
        requestIdleCallback(loadLogo, { timeout: 2000 });
      } else {
        setTimeout(loadLogo, 500); // Fallback for most browsers
      }
    }, [brandId]);

    const style: CSSProperties = {
      backgroundImage: `url('/images/thumbs/${projectId}.webp')`,
    };

    const focusClass = focused ? styles.projectThumbnailFocus : "";

    return (
      <div className={`${styles.projectThumbnail} ${focusClass}`} ref={ref}>
        <Link
          href={`/project-view?project=${projectId}`}
          scroll={false}
          className={styles.link}
        >
          <div className={styles.thumbBg} style={style}></div>
          <div className={styles.vignette}></div>
          <div className={styles.thumbContent}>
            <div>
              {logoSrc && (
                <Image
                  src={logoSrc}
                  className={styles.brandLogo}
                  loading="eager"
                  alt={`${brandId} logo`}
                  width={200}
                  height={100}
                />
              )}
            </div>
            <h4 className={styles.thumbTitle}>{title}</h4>
          </div>
        </Link>
      </div>
    );
  },
);

ProjectThumbnail.displayName = "ProjectThumbnail";

export default ProjectThumbnail;
