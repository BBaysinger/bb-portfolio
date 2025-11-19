import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import React, {
  forwardRef,
  useEffect,
  useState,
  useImperativeHandle,
} from "react";

import { useResponsiveThumbnail } from "@/hooks/useResponsiveThumbnail";
import getBrandLogoUrl from "@/utils/getBrandLogoUrl";

import styles from "./ProjectThumbnail.module.scss";

/**
 * Props for the `ProjectThumbnail` component.
 *
 * Represents a single portfolio project tile with NDA-aware rendering state.
 * Most props are derived from project/brand data; some (e.g. `focused`) are
 * interaction state supplied by parent list logic.
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
 * ProjectThumbnail component
 *
 * Renders a portfolio project or NDA (confidential) placeholder as a clickable
 * tile. Handles:
 * - Responsive thumbnail selection (desktop vs mobile)
 * - NDA visibility rules (locks + alternate confidential artwork)
 * - Deferred brand logo loading (idle callback or timeout fallback)
 * - Deterministic decorative stripe background based on list index
 * - Dynamic height CSS variable via ResizeObserver (for layout harmonization)
 *
 * Accessibility:
 * - Uses an aria-label describing confidential state or the project title.
 * - Locks NDA projects behind login, routing unauthenticated users to /login.
 *
 * Performance considerations:
 * - Defers non-critical logo loading to idle time to avoid main content jank.
 * - Uses lightweight background images & stripe cycling without extra DOM nodes.
 *
 * NDA logic overview:
 * A project is considered "NDA-like" when either the project itself (`nda`) or
 * its brand (`brandIsNda`) is confidential. Unauthenticated users see a locked
 * thumbnail and are routed to `/login/`. Authenticated users see the real
 * thumbnail; if missing, a confidential fallback is used.
 *
 * @component
 * @param props ProjectThumbnailProps
 * @param ref Forwarded ref to the outer container div
 * @returns JSX.Element
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

    // Expose the inner div to parent via forwarded ref
    // Non-null assertion: parent should only access ref after mount
    useImperativeHandle(ref, () => thumbRef.current!, [thumbRef.current]);

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
            {showNdaConfidential ? (
              <span>
                Please <Link href="/login">log in</Link> to view this project
              </span>
            ) : (
              <span>{title}</span>
            )}
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
        className={clsx(
          styles.projectThumbnail,
          focusClass,
          showNdaConfidential ? styles.nda : "",
        )}
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
        <div className={styles.stripesContainer}>
          <div className={`${styles.stripes} ${styles.stripesTop}`}></div>
          <div
            className={`${styles.stripes} ${styles.stripesBottom}`}
            style={stripeVars}
          ></div>
        </div>
        {showNdaConfidential && (
          <Image
            src="/images/projects-list/nda-locked.webp"
            alt="Locked"
            width={294}
            height={346}
            className={styles.lockedIcon}
          />
        )}
      </div>
    );
  },
);

ProjectThumbnail.displayName = "ProjectThumbnail";

export default ProjectThumbnail;
