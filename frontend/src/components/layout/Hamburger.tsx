import React from "react";
import { useDispatch } from "react-redux";

import { toggleMenu } from "store/menuSlice";
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
  const dispatch = useDispatch();

  return (
    <button
      type="button"
      className={styles["navbar-toggle"]}
      onClick={() => dispatch(toggleMenu())}
    >
      <span className={styles["sr-only"]}>Toggle navigation</span>
      <span className={styles["icon-bar"]}></span>
      <span className={styles["icon-bar"]}></span>
      <span className={styles["icon-bar"]}></span>
    </button>
  );
};

export default Hamburger;
