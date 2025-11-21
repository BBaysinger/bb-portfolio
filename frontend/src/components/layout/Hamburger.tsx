import React from "react";
import { useSelector, useDispatch } from "react-redux";

import { RootState } from "@/store/store";
import { toggleMobileNav } from "@/store/uiSlice";

import styles from "./Hamburger.module.scss";

/**
 * Mobile hamburger menu toggle button
 *
 * A three-bar animated button that toggles the mobile navigation menu.
 * Connected to Redux state to show open/closed state and dispatch toggle actions.
 * Implements WCAG 2.1 accessible menu button pattern with ARIA attributes.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes to apply
 *
 * @example
 * ```tsx
 * <Hamburger className="custom-positioning" />
 * ```
 *
 * Accessibility features:
 * - Dynamic aria-label announces current state ("Open menu" / "Close menu")
 * - aria-expanded communicates open/closed state to assistive technology
 * - aria-controls references the mobile nav element ID
 * - Animated icon bars marked aria-hidden to prevent redundant announcements
 *
 * Visual features:
 * - Animated three-bar icon that transforms when menu is open
 * - Hover and focus states for better UX
 * - Redux integration for global mobile nav state
 */
const Hamburger: React.FC<{ className: string }> = ({ className }) => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const dispatch = useDispatch();
  const classNames =
    `${styles.hamburger} ${className} ` +
    `${isMenuOpen ? styles.navExpanded : ""}`;

  /** Dynamic label for screen readers based on menu state */
  const label = isMenuOpen ? "Close menu" : "Open menu";
  return (
    <button
      type="button"
      className={classNames}
      aria-label={label}
      aria-expanded={isMenuOpen}
      aria-controls="mobile-nav"
      onClick={() => dispatch(toggleMobileNav())}
    >
      <span className={styles.iconBar} aria-hidden="true"></span>
      <span className={styles.iconBar} aria-hidden="true"></span>
      <span className={styles.iconBar} aria-hidden="true"></span>
    </button>
  );
};

export default Hamburger;
