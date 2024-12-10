import React from "react";
import { NavLink } from "react-router-dom";
import MiscUtils from "utils/MiscUtils";

import navLogo from "assets/images/misc/bb-logo.svg";
import "./Navbar.scss";

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
        className="navbar-inverse navbar-fixed-top"
        role="navigation"
      >
        <NavLink to="/">
          <img src={navLogo} alt="BB Logo" style={logoStyle} />
        </NavLink>
        <div id="navTitle">
          <div className="nav-logo-text">
            <p>
              <span>BRADLEY</span> <span>BAYSINGER</span>
            </p>
            <p>
              <span className="nobr">
                Interactive Web &bull; Front-end Developer
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          className="navbar-toggle"
          onClick={this.handleToggleNav}
        >
          <span className="sr-only">Toggle navigation</span>
          <span className="icon-bar"></span>
          <span className="icon-bar"></span>
          <span className="icon-bar"></span>
        </button>

        <div className={"the-navbar " + navClass} id="navbar-collapse-1">
          <ul className="nav navbar-nav" style={navStyle}>
            <li>
              <NavLink
                to="/portfolio#list"
                className={({ isActive }) =>
                  MiscUtils.isActiveOrAlt(isActive, "/")
                }
              >
                Portfolio
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/cv#top"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                CV
              </NavLink>
            </li>
            {/* <li>
              <NavLink
                to="/whoami"
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Who Am I
              </NavLink>
            </li> */}
          </ul>
        </div>
      </nav>
    );
  }
}

export default NavBar;
