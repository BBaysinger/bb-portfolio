import React from "react";
import { NavLink } from "react-router-dom";
import MiscUtils from "utils/MiscUtils";

import "./SlideOutNavigation.scss";

interface SlideOutNavProps {
  collapseSlideOutHandler: Function;
}

/**
 * This is the mobile nav that appears to populate behind the page conent that
 * slides over to reveal it.
 *
 * I think I made it separate from desktop nav for flexibility, but also that
 * I may have not known at the time that it wouldn't have been difficult to apply
 * the same feature with CSS alone. Specifically how flexbox and/or z-index would
 * have let me reorder the elements, where this needs populated behind the page
 * content. TODO: Maybe fix that, if we'll have lots of people reviewing code here.
 * But there are bigger fish to fry rn. Remember that I've had performance issues
 * toggling between fixed and static position before...
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
      <nav id="slideout_nav" role="navigation">
        <img
          id="b_square_nav"
          src="/images/misc/nav-backing-logo.png"
          alt=""
        ></img>

        <ul id="slideout_nav_buttons">
          <li>
            <NavLink
              onClick={this.handleCollapseNav}
              to="/portfolio"
              className={({ isActive }) =>
                MiscUtils.isActiveOrAlt(isActive, "/")
              }
            >
              Portfolio
            </NavLink>
          </li>
          <li>
            <NavLink
              onClick={this.handleCollapseNav}
              to="/cv"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              CV
            </NavLink>
          </li>
          {/* <li>
            <NavLink
              onClick={this.handleCollapseNav}
              to="/whoami"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Who Am I?
            </NavLink>
          </li> */}
          {/* <li>
            <NavLink onClick={this.handleCollapseNav} to="/whoami" activeClassName="active">Who Am I</NavLink>
          </li> */}
        </ul>
      </nav>
    );
  }
}

export default SlideOutNav;
