"use client";

import React from "react";

import styles from "./SkipLink.module.scss";

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
const SkipLink: React.FC<{ targetId?: string }> = ({
  targetId = "main-content",
}) => {
  return (
    <a href={`#${targetId}`} className={styles.skipLink}>
      Skip to main content
    </a>
  );
};

export default SkipLink;
