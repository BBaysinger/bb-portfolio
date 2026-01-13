"use client";

import React from "react";

import styles from "./SkipLink.module.scss";

type SkipLinkProps = {
  /** ID of the main content element to link to. */
  targetId?: string;
};

/**
 * Accessible skip link allowing keyboard users to bypass repeated navigation.
 *
 * Provides a WCAG 2.1 compliant bypass mechanism for keyboard users to skip
 * directly to main content, avoiding repetitive navigation on every page.
 * Visually hidden until focused, then appears at top of viewport.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.targetId="main-content"] - ID of the main content element to link to
 *
 * @example
 * ```tsx
 * // Default target
 * <SkipLink />
 *
 * // Custom target
 * <SkipLink targetId="custom-main" />
 * ```
 *
 * Accessibility:
 * - Positioned offscreen by default (top: -4rem)
 * - Becomes visible when focused via keyboard (top: 0.75rem)
 * - High z-index ensures it appears above all other content when focused
 * - Smooth transition respects prefers-reduced-motion
 *
 * Requirements:
 * - Target element must exist with matching ID
 * - Typically placed at start of <body> before any navigation
 */
const SkipLink: React.FC<SkipLinkProps> = ({ targetId = "main-content" }) => {
  const handleClick = () => {
    // Browsers will scroll to the hash target automatically, but they do not always
    // move keyboard focus. Explicitly focusing the target improves screen reader
    // and keyboard UX (common skip-link best practice).
    requestAnimationFrame(() => {
      const el = document.getElementById(targetId);
      if (!el) return;

      // If the target isn't normally focusable (e.g., a <div>), temporarily allow focus.
      // AppShell sets tabIndex on the default target; this is a safe fallback for custom IDs.
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");

      try {
        (el as HTMLElement).focus();
      } catch {
        // Ignore: focus can fail for non-HTMLElement targets.
      }
    });
  };

  return (
    <a href={`#${targetId}`} className={styles.skipLink} onClick={handleClick}>
      Skip to main content
    </a>
  );
};

export default SkipLink;
