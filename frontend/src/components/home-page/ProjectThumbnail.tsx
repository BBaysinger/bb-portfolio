import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";

import getBrandLogoUrl from "@/utils/getBrandLogoUrl";

import styles from "./ProjectThumbnail.module.scss";

/**
 * Props for the ProjectThumbnail component.
 */
interface ProjectThumbnailProps {
  /** Position in the projects list (used for stripe color cycling and image priority). */
  index: number;
  /** If true, thumbnail will be hidden (not yet implemented). */
  omitFromList: boolean;
  /** Unique project identifier. */
  projectId: string;
  /** Project display title. */
  title: string;
  /** Brand identifier for logo lookup. */
  brandId: string;
  /** Optional light-themed brand logo URL. */
  brandLogoLightUrl?: string;
  /** Optional dark-themed brand logo URL. */
  brandLogoDarkUrl?: string;
  /** If true, brand logos are hidden in public UI. */
  brandIsNda?: boolean;
  /** If true, project is confidential (NDA). */
  nda?: boolean;
  /** Thumbnail image URL. */
  thumbUrl?: string;
  /** Current user authentication state. */
  isAuthenticated: boolean;
  /** If true, applies scroll-focus styling (from parent hook). */
  focused?: boolean;
  /** Callback to register this thumbnail's DOM ref with parent. */
  setRef?: (el: HTMLDivElement | null) => void;
}

/**
 * Portfolio project thumbnail component.
 *
 * Renders an individual project tile with:
 * - Responsive Next.js Image optimization.
 * - NDA-aware rendering (locked overlay for unauthenticated users).
 * - Deferred brand logo loading via idle callback.
 * - Deterministic decorative stripe backgrounds (cycling green/yellow/purple).
 * - Dynamic height CSS variable for layout harmonization.
 * - Scroll-focus styling integration (via `focused` prop).
 *
 * Authentication & NDA logic:
 * - Projects marked as NDA or with NDA brands show a locked icon when user is not authenticated.
 * - Unauthenticated users are routed to `/login/` on click.
 * - Authenticated users access NDA projects via `/nda/{id}`, public via `/project/{id}`.
 *
 * @param props - Component properties.
 * @returns JSX element representing a single portfolio thumbnail.
 */

const ProjectThumbnail: React.FC<ProjectThumbnailProps> = ({
  index,
  projectId,
  title,
  brandId,
  brandLogoLightUrl,
  brandLogoDarkUrl,
  brandIsNda,
  nda,
  thumbUrl,
  isAuthenticated,
  focused,
  setRef,
}) => {
  const localRef = useRef<HTMLDivElement>(null);
  const [_logoSrc, setLogoSrc] = useState<string | null>(null);

  // Defer brand logo loading to idle time to prioritize critical content.
  useEffect(() => {
    const loadLogo = () => {
      const chosen = getBrandLogoUrl({
        brandId,
        brandIsNda: brandIsNda || !!nda,
        allowNdaLogo: isAuthenticated,
        lightUrl: brandLogoLightUrl,
        darkUrl: brandLogoDarkUrl,
        preferDark: true,
      });
      setLogoSrc(chosen);
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadLogo, { timeout: 2000 });
    } else {
      setTimeout(loadLogo, 500);
    }
  }, [
    brandId,
    brandLogoDarkUrl,
    brandLogoLightUrl,
    brandIsNda,
    nda,
    isAuthenticated,
  ]);

  // Determine NDA state and apply scroll-focus class.
  const isNdaLike = Boolean(nda || brandIsNda);
  const showNdaConfidential = isNdaLike && !isAuthenticated;
  const focusClass = focused ? styles.projectThumbnailFocus : "";

  // Cycle stripe background deterministically by index.
  const stripeColors = ["green", "yellow", "purple"];
  const stripeColor = stripeColors[index % stripeColors.length];
  const stripeVars: React.CSSProperties = {
    backgroundImage: `url('/images/projects-list/stripes-${stripeColor}.webp')`,
  };

  // Measure and expose thumbnail height as CSS variable for grid layout.
  const [thumbHeight, setThumbHeight] = useState(0);
  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const update = () => setThumbHeight(el.offsetHeight);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  const inner = (
    <>
      {!showNdaConfidential && thumbUrl && (
        <Image
          src={thumbUrl}
          alt={title}
          fill
          className={styles.thumbBg}
          style={{ objectFit: "cover" }}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          priority={index < 3}
        />
      )}
      <div className={styles.vignette}></div>
      <div className={styles.thumbContent}>
        <h4 className={styles.thumbTitle}>
          {showNdaConfidential ? (
            <span>Please log in to view this project</span>
          ) : (
            <span>{title}</span>
          )}
        </h4>
      </div>
    </>
  );

  // Determine link target based on authentication and NDA status.
  const href = showNdaConfidential
    ? "/login/"
    : `${isNdaLike ? "/nda/" : "/project/"}${encodeURIComponent(projectId)}`;

  return (
    <div
      ref={(el) => {
        localRef.current = el;
        setRef?.(el);
      }}
      className={clsx(
        styles.projectThumbnail,
        focusClass,
        showNdaConfidential ? styles.nda : "",
      )}
      style={{ "--thumb-height": `${thumbHeight}px` } as React.CSSProperties}
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
};

export default ProjectThumbnail;
