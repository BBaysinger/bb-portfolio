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
  nda?: boolean;
  thumbUrl?: string;
  thumbAlt?: string;
}

/**
 * The thumbnails in the home/portfolio page section that each link out to a specific
 * portfolio project via dynamic routing.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
const ProjectThumbnail = forwardRef<HTMLDivElement, ProjectThumbnailProps>(
  ({ focused, projectId, title, brandId, nda, thumbUrl, thumbAlt }, ref) => {
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

    const bgImage = !nda
      ? thumbUrl || `/images/thumbs/${projectId}.webp`
      : undefined;
    const style: React.CSSProperties = bgImage
      ? { backgroundImage: `url('${bgImage}')` }
      : {};

    const focusClass = focused ? styles.projectThumbnailFocus : "";

    const inner = (
      <>
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
          <h4 className={styles.thumbTitle}>
            {nda ? "Confidential Project" : title}
          </h4>
        </div>
      </>
    );

    return (
      <div className={`${styles.projectThumbnail} ${focusClass}`} ref={ref}>
        {nda ? (
          <div className={styles.link} aria-label="Confidential Project">
            {inner}
          </div>
        ) : (
          <Link href={`/project-view/${projectId}`} className={styles.link}>
            {inner}
          </Link>
        )}
      </div>
    );
  },
);

ProjectThumbnail.displayName = "ProjectThumbnail";

export default ProjectThumbnail;
