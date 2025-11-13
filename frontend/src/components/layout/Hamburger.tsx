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
 * Features:
 * - Animated three-bar icon that transforms when menu is open
 * - Screen reader accessible with descriptive text
 * - Redux integration for global mobile nav state
 * - Hover and focus states for better UX
 */
const Hamburger: React.FC<{ className: string }> = ({ className }) => {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );

  const dispatch = useDispatch();
  const classNames =
    `${styles.hamburger} ${className} ` +
    `${isMenuOpen ? styles.navExpanded : ""}`;

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => dispatch(toggleMobileNav())}
    >
      <div className={styles.srOnly}>Toggle navigation</div>
      <span className={styles.iconBar}></span>
      <span className={styles.iconBar}></span>
      <span className={styles.iconBar}></span>
    </button>
  );
};

export default Hamburger;
