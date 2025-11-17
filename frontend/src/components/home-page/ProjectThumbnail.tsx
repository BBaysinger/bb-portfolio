// import Image from "next/image";
import Link from "next/link";
import React, { forwardRef, useEffect, useState } from "react";

import { useResponsiveThumbnail } from "@/hooks/useResponsiveThumbnail";
import getBrandLogoUrl from "@/utils/getBrandLogoUrl";

import styles from "./ProjectThumbnail.module.scss";

/**
 * Individual project thumbnail component for the portfolio grid.
 *
 * Renders project thumbnails with brand logos, hover effects, and NDA-aware styling.
 * Supports responsive image loading, accessibility features, and both public and
 * confidential project display modes.
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.focused - Whether this thumbnail is currently focused
 * @param {string} props.projectId - Unique project identifier
 * @param {string} props.title - Project title for display and alt text
 * @param {string} props.brandId - Associated brand identifier
 * @param {boolean} [props.nda] - Whether this is an NDA/confidential project
 * @param {boolean} [props.brandIsNda] - Whether to hide brand logos in public UI
 * @param {number} [props.ndaIndex] - Index among NDA projects for color cycling
 * @param {React.Ref} ref - Forwarded ref to the container element
 */
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
  isAuthenticated: boolean;
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
      index,
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
      isAuthenticated,
    },
    ref,
  ) => {
    // Get the appropriate image URL based on viewport size
    const responsiveThumbUrl = useResponsiveThumbnail(thumbUrl, thumbUrlMobile);
    const [_logoSrc, setLogoSrc] = useState<string | null>(null);

    useEffect(() => {
      const loadLogo = () => {
        const chosen = getBrandLogoUrl({
          brandId,
          // Hide logos for NDA items unless authenticated (home page can show logo when authed)
          brandIsNda: brandIsNda || !!nda,
          allowNdaLogo: isAuthenticated,
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
      return `/images/projects-list/confidential-thumbnail-${colors[colorIndex]}.webp`;
    };

    // Treat a project as NDA-like when either the project or brand is NDA.
    const isNdaLike = Boolean(nda || brandIsNda);
    const showNdaConfidential = isNdaLike && !isAuthenticated;

    // If NDA-like and unauthenticated, force confidential background.
    // If NDA-like and authenticated but missing a thumbnail (edge), fall back to confidential bg.
    const bgImage = showNdaConfidential
      ? getConfidentialThumbnail(ndaIndex)
      : responsiveThumbUrl ||
        (isNdaLike ? getConfidentialThumbnail(ndaIndex) : undefined);
    const style: React.CSSProperties = bgImage
      ? { backgroundImage: `url('${bgImage}')` }
      : {};

    const focusClass = focused ? styles.projectThumbnailFocus : "";

    // Deterministic stripe color via CSS variable (no class variants needed)
    const stripeColors = ["green", "yellow", "purple"];
    const stripeColor = stripeColors[index % stripeColors.length];
    const stripeVars: React.CSSProperties = {
      backgroundImage: `url('/images/projects-list/stripes-${stripeColor}.webp')`,
    };

    // HEIGHT MEASUREMENT
    const [thumbHeight, setThumbHeight] = useState(0);
    const thumbRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = thumbRef.current;
      if (!el) return;

      const update = () => {
        const h = el.offsetHeight;
        setThumbHeight(h);
      };

      const ro = new ResizeObserver(update);
      ro.observe(el);

      update();

      return () => {
        ro.disconnect();
      };
    }, []);

    const inner = (
      <>
        <div className={styles.thumbBg} style={style}></div>
        <div className={styles.vignette}></div>
        <div className={styles.thumbContent}>
          <h4 className={styles.thumbTitle}>
            {showNdaConfidential ? "Please log in to view this project" : title}
          </h4>
          {/* <div>
            {(logoSrc || showNdaConfidential) && (
              <Image
                src={logoSrc || "/images/projects-list/confidential-word.svg"}
                className={styles.brandLogo}
                loading="eager"
                alt={
                  showNdaConfidential ? "Confidential Project" : `${title} logo`
                }
                width={200}
                height={100}
              />
            )}
          </div> */}
          {/* <h4 className={styles.thumbTitle}>
            {showNdaConfidential ? "Please log in to view this project" : title}
          </h4> */}
        </div>
      </>
    );

    // Link behavior (canonical, segment-based):
    // - NDA-like + unauthenticated → /login
    // - NDA-like + authenticated → /nda/<id>
    // - Public → /project/<id>
    const href = showNdaConfidential
      ? "/login/"
      : `${isNdaLike ? "/nda/" : "/project/"}${encodeURIComponent(projectId)}`;

    return (
      <div
        ref={thumbRef}
        className={`${styles.projectThumbnail} ${focusClass}`}
        style={
          {
            "--thumb-height": `${thumbHeight}px`,
          } as React.CSSProperties
        }
      >
        <Link
          href={href}
          className={styles.link}
          aria-label={showNdaConfidential ? "Confidential Project" : title}
        >
          {inner}
        </Link>
        <div
          ref={ref}
          className={`${styles.stripes} ${styles.stripesTop}`}
        ></div>
        <div
          className={`${styles.stripes} ${styles.stripesBottom}`}
          style={stripeVars}
        ></div>
      </div>
    );
  },
);

ProjectThumbnail.displayName = "ProjectThumbnail";

export default ProjectThumbnail;
