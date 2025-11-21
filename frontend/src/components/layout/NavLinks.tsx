"use client";

import Link from "next/link";
import React, { useEffect, useRef, useCallback } from "react";

import AuthNavItem from "@/components/common/AuthNavItem";
import { useNavHighlight } from "@/hooks/useNavHighlight";

import styles from "./NavLinks.module.scss";

interface NavLinksProps {
  onClick?: () => void;
  className?: string;
  /** Override the aria-label on the wrapping landmark */
  ariaLabel?: string;
  /** Visual/semantic context where this nav is used */
  variant?: "primary" | "mobile" | "footer";
  /** State indicating the mobile drawer is open (used when variant === 'mobile') */
  mobileOpen?: boolean;
  /** Focus first link automatically when mobile nav opens */
  focusOnOpen?: boolean;
  /** Callback when Escape pressed in open mobile nav */
  onCloseRequest?: () => void;
  /** Optional id applied to wrapper (useful for aria-controls on toggle button) */
  id?: string;
  /** Element to render as wrapper to avoid nested nav landmarks */
  as?: "nav" | "div";
}

/**
 * Navigation link list populated around the site, like nav variants and footer.
 *
 * Provides accessible navigation with variant-aware behavior for primary (desktop),
 * mobile drawer, and footer contexts. Supports keyboard navigation, focus management,
 * and proper ARIA semantics.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Function} [props.onClick] - Click handler for nav items
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.ariaLabel] - Custom aria-label (defaults based on variant)
 * @param {"primary" | "mobile" | "footer"} [props.variant="primary"] - Navigation context
 * @param {boolean} [props.mobileOpen] - Mobile drawer open state
 * @param {boolean} [props.focusOnOpen=true] - Auto-focus first link when mobile opens
 * @param {Function} [props.onCloseRequest] - Callback for Escape key close
 * @param {string} [props.id] - Element ID for aria-controls reference
 * @param {"nav" | "div"} [props.as="nav"] - Wrapper element type
 *
 * @example
 * ```tsx
 * // Primary desktop nav
 * <NavLinks variant="primary" />
 *
 * // Mobile drawer with Redux state
 * <NavLinks
 *   variant="mobile"
 *   mobileOpen={isOpen}
 *   onCloseRequest={() => dispatch(close())}
 *   id="mobile-nav"
 *   as="div"
 * />
 *
 * // Footer navigation
 * <NavLinks variant="footer" ariaLabel="Footer navigation" />
 * ```
 */
const NavLinks: React.FC<NavLinksProps> = ({
  onClick,
  className,
  ariaLabel,
  variant = "primary",
  mobileOpen,
  focusOnOpen = true,
  onCloseRequest,
  id,
  as = "nav",
}) => {
  const active = useNavHighlight();
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  /**
   * Generates CSS class names for navigation links based on active state
   * @param {string} target - The route identifier to check against active state
   * @returns {string} Combined class names
   */
  const linkClass = (target: string) =>
    `${styles.link} ${active === target ? styles.active : ""}`;

  // Determine labeling based on variant if not explicitly provided
  const resolvedLabel =
    ariaLabel ??
    (variant === "primary"
      ? "Main navigation"
      : variant === "mobile"
        ? "Mobile navigation"
        : "Footer navigation");

  const isMobileVariant = variant === "mobile";
  /** When true, mobile nav is rendered but closed - remove from tab order */
  const isInactiveMobile = isMobileVariant && !mobileOpen;

  /**
   * Focus first link when mobile drawer opens for keyboard accessibility
   */
  useEffect(() => {
    if (isMobileVariant && mobileOpen && focusOnOpen && firstLinkRef.current) {
      firstLinkRef.current.focus();
    }
  }, [isMobileVariant, mobileOpen, focusOnOpen]);

  /**
   * Keyboard handler for Escape key to close mobile navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isMobileVariant && mobileOpen && e.key === "Escape") {
        onCloseRequest?.();
      }
    },
    [isMobileVariant, mobileOpen, onCloseRequest],
  );

  /**
   * Generates accessibility props for nav links
   * Removes inactive mobile links from tab order and attaches ref to first link
   * @param {number} idx - Link index (0-based)
   * @returns {Object} Props for Link component
   */
  const linkAccessibilityProps = (idx: number) => ({
    tabIndex: isInactiveMobile ? -1 : undefined,
    ref: idx === 0 ? firstLinkRef : undefined,
  });

  /** Dynamic wrapper element to avoid nested nav landmarks */
  const WrapperElement = as as React.ElementType;

  return (
    <WrapperElement
      id={id}
      aria-label={resolvedLabel}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-hidden={isInactiveMobile ? true : undefined}
      data-variant={variant}
    >
      <ul className={`${styles.navLinks} ${className ?? ""}`}>
        <li>
          <Link
            href="/#hero"
            className={linkClass("hero")}
            aria-current={active === "hero" ? "page" : undefined}
            {...linkAccessibilityProps(0)}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/#hello"
            className={linkClass("hello")}
            aria-current={active === "hello" ? "page" : undefined}
            {...linkAccessibilityProps(1)}
          >
            Hello
          </Link>
        </li>
        <li>
          <Link
            href="/#projects-list"
            className={linkClass("projects-list")}
            aria-current={active === "projects-list" ? "page" : undefined}
            {...linkAccessibilityProps(2)}
          >
            Projects
          </Link>
        </li>
        <li>
          <Link
            href="/cv#top"
            className={linkClass("cv")}
            aria-current={active === "cv" ? "page" : undefined}
            aria-label="Curriculum Vitae"
            {...linkAccessibilityProps(3)}
          >
            CV
          </Link>
        </li>
        <li>
          <Link
            href="/contact#top"
            className={linkClass("contact")}
            aria-current={active === "contact" ? "page" : undefined}
            {...linkAccessibilityProps(4)}
          >
            Contact
          </Link>
        </li>
        <AuthNavItem
          className={styles.login}
          linkClassName={linkClass("login")}
          {...(isInactiveMobile ? { tabIndex: -1 } : {})}
        />
      </ul>
    </WrapperElement>
  );
};

export default NavLinks;
