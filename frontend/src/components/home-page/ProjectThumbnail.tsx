import Image from "next/image";
import Link from "next/link";
import React, { forwardRef, useEffect, useState } from "react";

import styles from "./ProjectThumbnail.module.scss";

interface ProjectThumbnailProps {
  focused: boolean;
  key: string;
  index: number;
  omitFromList: boolean;
  projectId: string;
  title: string;
  brandId: string;
}

/**
 * The thumbnails in the portfolio/home that each link out to a specific
 * portfolio project via dynamic routing.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const ProjectThumbnail = forwardRef<HTMLDivElement, ProjectThumbnailProps>(
  ({ focused, projectId, title, brandId }, ref) => {
    const [logoSrc, setLogoSrc] = useState<string | null>(null);

    useEffect(() => {
      const loadLogo = () => {
        setLogoSrc(`/images/brand-logos/${brandId}.svg`);
      };

      // Since the brand logo is hidden, it falls outside of the browser-native
      // prioritization strategy, but still needs deferred to idle time to prioritize
      // the rest of the page. In other words, this is a deferred preload strategy
      // that accounts for SPAs and SSR.
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadLogo, { timeout: 2000 });
      } else {
        // FALLBACK: For many modern browsers! KEEP!
        setTimeout(loadLogo, 500);
      }
    }, [brandId]);

    const style: React.CSSProperties = {
      backgroundImage: `url('/images/thumbs/${projectId}.webp')`,
    };

    const focusClass = focused ? styles.projectThumbnailFocus : "";

    return (
      <div className={`${styles.projectThumbnail} ${focusClass}`} ref={ref}>
        <Link href={`/portfolio/${projectId}#project`}>
          {/* Must wrap with an actual element if not using legacyBehavior */}
          <a>
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
          </a>
        </Link>
      </div>
    );
  },
);

ProjectThumbnail.displayName = "ProjectThumbnail";

export default ProjectThumbnail;
