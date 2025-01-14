import React from "react";
import { useSelector, useDispatch } from "react-redux";

import { toggleMenu } from "store/menuSlice";
import { RootState } from "store/store";
import styles from "./Hamburger.module.scss";

/**
 * The nav that either gets revealed behind the page content (mobile),
 * or is populated as a bar at the top of the page.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const Hamburger: React.FC = ({}) => {
  const isMenuOpen = useSelector((state: RootState) => state.menu.isOpen);

  const dispatch = useDispatch();

  return (
    <button
      type="button"
      className={`${styles["navbar-toggle"]} ${isMenuOpen ? styles["nav-expanded"] : ""}`}
      onClick={() => dispatch(toggleMenu())}
    >
      <div className={styles["sr-only"]}>Toggle navigation</div>
      <span className={styles["icon-bar"]}></span>
      <span className={styles["icon-bar"]}></span>
      <span className={styles["icon-bar"]}></span>
    </button>
  );
};

export default Hamburger;
