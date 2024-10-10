import React from "react";

import NavBar from "./NavBar";
import Scroll from "react-scroll";

import headerLogo from "../../assets/images/main-header/logo-header.png";
import caret from "../../assets/images/main-header/caret.png";

import "@/styles/header.scss";

/**
 *
 */
interface HeaderMainProps {}

/**
 *
 */
interface HeaderMainState {
  height: number;
  caretAnimationStyle: string;
}

/**
 * This is the header on the home page only, which is distinct from the header on every other page.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class HeaderMain extends React.Component<{}, HeaderMainState> {
  /**
   *
   *
   * @memberof HeaderMain
   */
  static MARGIN_TOP = 26;

  /**
   *
   *
   * @memberof HeaderMain
   */
  scrolled = false;

  /**
   *Creates an instance of HeaderMain.
   *
   * @memberof HeaderMain
   */
  constructor(props: HeaderMainProps) {
    super(props);

    // Height is on state because of the toolbar issue with iOS Safari
    // We control when a change can affect our element, and use state
    // to trigger a rerender.
    this.state = {
      height: this.getHeight(),
      caretAnimationStyle: "",
    };
  }

  /**
   * Needed for the scroll-to-thumbs feature!
   *
   * @returns
   * @memberof HeaderMain
   */
  getHeight = () => {
    // 812 is iPhone X height in portrait.
    return Math.max(Math.min(window.innerHeight, 812), 500);
  };

  /**
   *
   *
   * @memberof HeaderMain
   */
  stopCaret() {
    if (!this.scrolled) {
      this.setState({ caretAnimationStyle: "none" });
      this.scrolled = true;
    }
  }

  /**
   *
   *
   * @memberof HeaderMain
   */
  scrollDown = () => {
    this.stopCaret();
    Scroll.animateScroll.scrollTo(this.getHeight() - NavBar.HEIGHT);
  };

  /**
   *
   *
   * @memberof HeaderMain
   */
  handleResize = () => {
    setTimeout(() => {
      this.setState({ height: this.getHeight() });
    }, 0); // Delay because width and height properties are not changed util after orientationchange fires.
  };

  /**
   *
   *
   * @memberof HeaderMain
   */
  handleScroll = () => {
    this.stopCaret();
  };

  /**
   *
   *
   * @memberof HeaderMain
   */
  componentDidMount() {
    setTimeout(() => {
      window.addEventListener("scroll", this.handleScroll);
    }, 50);
  }

  /**
   *
   *
   * @memberof HeaderMain
   */
  componentWillUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
  }

  /**
   *
   *
   * @returns
   * @memberof HeaderMain
   */
  render() {
    return (
      <header
        className="header_main"
        style={{ minHeight: this.state.height + "px" }}
      >
        <div className="overheadFill"></div>

        <img src={headerLogo} className="header-logo" alt="BB Logo" />
        <h1>Bradley Baysinger</h1>

        <h5 className="subhead">
          <span className="nobr">Interactive Web</span> &bull;{" "}
          <span className="nobr">UI Developer</span>
        </h5>

        <div
          className="view_portfolio"
          style={{ animation: this.state.caretAnimationStyle }}
        >
          <div onClick={this.scrollDown}>
            <h6>View Portfolio</h6>
            <img
              src={caret}
              width="50"
              height="30"
              className="caret-img"
              alt=""
            />
          </div>
        </div>
      </header>
    );
  }
}
