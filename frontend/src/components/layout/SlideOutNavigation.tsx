import React from "react";
import { NavLink } from "react-router-dom";
import MiscUtils from "utils/MiscUtils";

import styles from "./SlideOutNavigation.module.scss";

interface SlideOutNavProps {
  collapseSlideOutHandler: Function;
}

/**
 * This is the mobile nav that appears to populate behind the page conent that
 * slides over to reveal it.
 *
 * TODO: Use same nav for both mobile and desktop via styling.
 *
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
class SlideOutNav extends React.Component<SlideOutNavProps> {
  /**
   *
   *
   * @memberof SlideOutNav
   */
  handleCollapseNav = () => {
    this.props.collapseSlideOutHandler();
  };

  /**
   *
   *
   * @returns
   * @memberof SlideOutNav
   */
  render() {
    return (
      <nav className={styles["slideout-nav"]} role="navigation">
        <ul className={styles["slideout-nav-buttons"]}>
          <li>
            <NavLink
              onClick={this.handleCollapseNav}
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
              onClick={this.handleCollapseNav}
              to="/cv#top"
              className={({ isActive }) => (isActive ? styles["active"] : "")}
            >
              CV
            </NavLink>
          </li>
        </ul>
      </nav>
    );
  }
}

export default SlideOutNav;
