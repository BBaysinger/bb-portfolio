import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import useActivePointerType from "@/hooks/useActivePointerType";
import { useHasHover } from "@/hooks/useHasHover";
import { useHoverFocus } from "@/hooks/useHoverFocus";
import { useScrollFocus } from "@/hooks/useScrollFocus";
import getBrandLogoUrl from "@/utils/getBrandLogoUrl";

import styles from "./ProjectThumbnail.module.scss";

const ThumbnailBg = React.memo(function ThumbnailBg(props: {
  src: string;
  alt: string;
  priority: boolean;
  onError?: () => void;
}) {
  return (
    <Image
      src={props.src}
      alt={props.alt}
      fill
      className={styles.thumbBg}
      style={{ objectFit: "cover" }}
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
      priority={props.priority}
      onError={props.onError}
    />
  );
});

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
  /** Optional opaque short code used for NDA login return flow. */
  projectShortCode?: string;
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
  /** True when project data was sanitized due to missing auth. */
  isSanitized?: boolean;
  /** Thumbnail image URL. */
  thumbUrl?: string;
  /** Optional thumbnail alt text. */
  thumbAlt?: string;
  /** Optional locked-state thumbnail URL. */
  lockedThumbUrl?: string;
  /** Optional locked-state thumbnail alt text. */
  lockedThumbAlt?: string;
  /** Current user authentication state. */
  isAuthenticated: boolean;
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
 * - Scroll-focus styling integration (via internal hook).
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
  projectShortCode,
  title,
  brandId,
  brandLogoLightUrl,
  brandLogoDarkUrl,
  brandIsNda,
  nda,
  isSanitized,
  thumbUrl,
  thumbAlt,
  lockedThumbUrl,
  lockedThumbAlt,
  isAuthenticated,
}) => {
  const pointerType = useActivePointerType();
  const hasHover = useHasHover();
  const useHoverMode = hasHover && pointerType === "mouse";

  const { ref: focusRef, focused: scrollFocused } = useScrollFocus(projectId, {
    disabled: useHoverMode,
    minPersistMs: 400,
  });
  const hover = useHoverFocus({ enabled: useHoverMode, minPersistMs: 400 });
  const focused = useHoverMode ? hover.focused : scrollFocused;
  const [_logoSrc, setLogoSrc] = useState<string | null>(null);
  const [lockedThumbErrored, setLockedThumbErrored] = useState(false);

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
  const effectiveAuth = isAuthenticated && !isSanitized;
  const showNdaConfidential = isNdaLike && !effectiveAuth;
  const focusClass = focused ? styles.focused : "";
  const effectiveLockedThumbUrl = lockedThumbErrored
    ? undefined
    : lockedThumbUrl;
  const showLockedIcon = showNdaConfidential && !effectiveLockedThumbUrl;
  const ndaClass = showNdaConfidential
    ? effectiveLockedThumbUrl
      ? styles.ndaNoDim
      : styles.nda
    : "";

  const displayedThumbUrl = showNdaConfidential
    ? effectiveLockedThumbUrl || undefined
    : thumbUrl;
  const displayedThumbAlt = showNdaConfidential
    ? lockedThumbAlt || "Locked project thumbnail"
    : thumbAlt || title;

  const handleThumbError = React.useCallback(() => {
    if (showNdaConfidential) {
      setLockedThumbErrored(true);
    }
  }, [showNdaConfidential]);

  const inner = (
    <>
      {displayedThumbUrl && (
        <ThumbnailBg
          src={displayedThumbUrl}
          alt={displayedThumbAlt}
          priority={index < 3}
          onError={showNdaConfidential ? handleThumbError : undefined}
        />
      )}
      {/* <div className={styles.vignette}></div>
      <div className={styles.thumbContent}>
        <h4 className={styles.thumbTitle}>
          {showNdaConfidential ? (
            <span>Please log in to view this project</span>
          ) : (
            <span>{title}</span>
          )}
        </h4>
      </div> */}
    </>
  );

  // Determine link target based on authentication and NDA status.
  const href = showNdaConfidential
    ? "/login/"
    : `${isNdaLike ? "/nda/" : "/project/"}${encodeURIComponent(projectId)}`;

  return (
    <div
      ref={focusRef}
      {...hover.bind}
      className={clsx(styles.projectThumbnail, focusClass, ndaClass)}
      data-nda={showNdaConfidential ? "locked" : undefined}
      data-project-id={
        !showNdaConfidential && !isSanitized ? projectId : undefined
      }
    >
      <Link
        href={href}
        onClick={() => {
          if (!showNdaConfidential) return;
          try {
            // Store a stable post-login redirect key.
            // Prefer short code (opaque), but always fall back to projectId.
            sessionStorage.setItem(
              "postLoginProjectId",
              (projectId || "").trim(),
            );
            const code = (projectShortCode || "").trim();
            if (code) sessionStorage.setItem("postLoginProjectCode", code);
          } catch {}
        }}
        className={styles.link}
        aria-label={showNdaConfidential ? "Confidential Project" : title}
      >
        {inner}
      </Link>
      {showLockedIcon && (
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
