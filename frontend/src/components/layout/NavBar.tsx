import React from "react";
import { NavLink } from "react-router-dom";
import MiscUtils from "utils/MiscUtils";

import navLogo from "images/misc/bb-logo.svg";
import styles from "./Navbar.module.scss";

/**
 *
 */
interface NavBarProps {
  toggleSlideOutHandler: () => void;
  collapseSlideOutHandler: () => void;
}

/**
 *
 */
interface NavBarState {
  collapsed: boolean;
}

/**
 * Navigation as text buttons, and a button for slide-out nav, on mobile.
 *
 * TODO: Should be the same component as SlideOutNavigation, just styled differently
 * (multiple instances used concurrently, since they will both be onscreen at the same time).
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
class NavBar extends React.Component<NavBarProps, NavBarState> {
  /**
   *
   *
   * @static
   * @memberof NavBar
   */
  static HEIGHT = 50;

  /**
   * Creates an instance of NavBar.
   * @memberof NavBar
   */
  constructor(props: NavBarProps) {
    super(props);

    this.state = { collapsed: true };
  }

  /**
   *
   * @memberof NavBar
   */
  handleToggleNav = () => {
    this.props.toggleSlideOutHandler();
  };

  /**
   *
   *
   * @returns
   * @memberof NavBar
   */
  render() {
    const navStyle = {
      width: "100%",
    };

    const logoStyle: React.CSSProperties = {
      position: "absolute",
      maxHeight: "38px",
      top: "6px",
      left: "14px",
    };

    const { collapsed } = this.state;
    const navClass = collapsed ? "collapse" : "";

    return (
      <nav
        id="top-navbar"
        className={styles["navbar-fixed-top"]}
        role="navigation"
      >
        <NavLink to="/">
          <img src={navLogo} alt="BB Logo" style={logoStyle} />
        </NavLink>
        <div id={styles.navTitle}>
          <div className={styles["nav-logo-text"]}>
            <p>
              <span>BRADLEY</span> <span>BAYSINGER</span>
            </p>
            <p>
              <span className={styles["nobr"]}>
                Interactive Web &bull; Front-end Developer
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles["navbar-toggle"]}
          onClick={this.handleToggleNav}
        >
          <span className={styles["sr-only"]}>Toggle navigation</span>
          <span className={styles["icon-bar"]}></span>
          <span className={styles["icon-bar"]}></span>
          <span className={styles["icon-bar"]}></span>
        </button>

        <div className={`${styles["the-navbar"]} ${navClass}`}>
          <ul
            className={`${styles["nav"]} ${styles["navbar-nav"]}`}
            style={navStyle}
          >
            <li>
              <NavLink
                to="/portfolio#list"
                className={({ isActive }) =>
                  MiscUtils.isActiveOrAlt(isActive, "/", styles["active"])
                }
              >
                Portfolio
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/cv#top"
                className={({ isActive }) => (isActive ? styles["active"] : "")}
              >
                CV
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    );
  }
}

export default NavBar;
