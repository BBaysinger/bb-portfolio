import Image from "next/image";
import Link from "next/link";
import React, { forwardRef, useEffect, useState } from "react";

import { useResponsiveThumbnail } from "@/hooks/useResponsiveThumbnail";
import getBrandLogoUrl from "@/utils/getBrandLogoUrl";

import styles from "./ProjectThumbnail.module.scss";

interface ProjectThumbnailProps {
  focused: boolean;
  key: string;
  index: number;
  omitFromList: boolean;
  projectId: string;
  title: string;
  brandId: string;
  /** Optional logo URL for light backgrounds (preferred when site has light bg). */
  brandLogoLightUrl?: string;
  /** Optional logo URL for dark backgrounds (preferred for current site). */
  brandLogoDarkUrl?: string;
  /** When true, hide brand logos in public UI. */
  brandIsNda?: boolean;
  nda?: boolean;
  /** Index among NDA projects only (0-based) for color cycling. */
  ndaIndex?: number;
  thumbUrl?: string;
  thumbUrlMobile?: string;
  thumbAlt?: string;
}

/**
 * The thumbnails in the home/portfolio page section that each link out to a specific
 * portfolio project via dynamic routing.
 *
 */
const ProjectThumbnail = forwardRef<HTMLDivElement, ProjectThumbnailProps>(
  (
    {
      focused,
      projectId,
      title,
      brandId,
      brandLogoLightUrl,
      brandLogoDarkUrl,
      brandIsNda,
      nda,
      ndaIndex = 0,
      thumbUrl,
      thumbUrlMobile,
    },
    ref,
  ) => {
    // Get the appropriate image URL based on viewport size
    const responsiveThumbUrl = useResponsiveThumbnail(thumbUrl, thumbUrlMobile);
    const [logoSrc, setLogoSrc] = useState<string | null>(null);

    useEffect(() => {
      const loadLogo = () => {
        const chosen = getBrandLogoUrl({
          brandId,
          // Hide logos if brand or project is NDA
          brandIsNda: brandIsNda || !!nda,
          lightUrl: brandLogoLightUrl,
          darkUrl: brandLogoDarkUrl,
          preferDark: true,
        });
        setLogoSrc(chosen);
      };

      // Since the brand logo is hidden, it falls outside of the browser-native
      // prioritization strategy, but still benefits from deferring to idle time
      // to prioritize the rest of the page. This is a deferred preload strategy
      // that accounts for SPAs and SSR.
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadLogo, { timeout: 2000 });
      } else {
        setTimeout(loadLogo, 500);
      }
    }, [brandId, brandLogoDarkUrl, brandLogoLightUrl, brandIsNda, nda]);

    // Cycle through colored confidential thumbnails for NDA projects
    const getConfidentialThumbnail = (index: number) => {
      const colors = ["green", "purple", "yellow"];
      const colorIndex = index % colors.length;
      return `/images/home/confidential-thumbnail-${colors[colorIndex]}.webp`;
    };

    const bgImage = nda
      ? getConfidentialThumbnail(ndaIndex)
      : responsiveThumbUrl;
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
            {(logoSrc || nda) && (
              <Image
                src={logoSrc || "/images/home/confidential-word.svg"}
                className={styles.brandLogo}
                loading="eager"
                alt={nda ? "Confidential Project" : `${title} logo`}
                width={200}
                height={100}
              />
            )}
          </div>
          <h4 className={styles.thumbTitle}>
            {nda ? "Please log in to view this project" : title}
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
          <Link href={`/project-view/${projectId}/`} className={styles.link}>
            {inner}
          </Link>
        )}
      </div>
    );
  },
);

ProjectThumbnail.displayName = "ProjectThumbnail";

export default ProjectThumbnail;
