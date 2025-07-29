import React from "react";
import { useSelector, useDispatch } from "react-redux";

import { RootState } from "@/store/store";
import { toggleMobileNav } from "@/store/uiSlice";

import styles from "./Hamburger.module.scss";

/**
 * The nav that either gets revealed behind the page content (mobile),
 * or is populated as a bar at the top of the page.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
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
