import React from "react";
import { NavLink } from "react-router-dom";
import MiscUtils from "utils/MiscUtils";

import styles from "./SlideOutNavigation.module.scss";

interface SlideOutNavProps {
  collapseSlideOutHandler: () => void;
}

/**
 * This is the mobile nav that appears to populate behind the page content.
 *
 * TODO: Use same nav for both mobile and desktop via styling.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const SlideOutNav: React.FC<SlideOutNavProps> = ({
  collapseSlideOutHandler,
}) => {
  const handleCollapseNav = () => {
    collapseSlideOutHandler();
  };

  return (
    <nav className={styles["slideout-nav"]} role="navigation">
      <ul className={styles["slideout-nav-buttons"]}>
        <li>
          <NavLink
            onClick={handleCollapseNav}
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
            onClick={handleCollapseNav}
            to="/cv#top"
            className={({ isActive }) => (isActive ? styles["active"] : "")}
          >
            CV
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default SlideOutNav;
