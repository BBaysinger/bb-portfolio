import React from "react";

import Sniffer from "../utils/Sniffer";

import "./PieceInfoFeatures.scss";

interface PIANFProps {
  transition: string;
  pieceData: any;
}

/**
 * The component that owns the buttons and paragraphs of the display of each portfolio item.
 *
 * The paragraphs can be styled
 * differently depending on the type of information. And the buttons
 * link out to the features available for each portfolio peice.
 *
 * TODO: Could this be more pure if we separated these out to two components?...
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class PieceInfoFeatures extends React.Component<PIANFProps> {
  /**
   *
   *
   * @static
   * @memberof PieceInfoFeatures
   */
  static DESKTOP_PREFERRED = "desktop_preferred";

  /**
   *
   *
   * @static
   * @memberof PieceInfoFeatures
   */
  static DESKTOP_ONLY = "desktop_only";

  /**
   *
   *
   * @memberof PieceInfoFeatures
   */
  peiceData = null;

  /**
   * Need a reference to allow parent component access to computed height of div.
   *
   *
   * @memberof PieceInfoFeatures
   */
  public domElem: HTMLElement | null = null;

  /**
   *
   *
   * @memberof PieceInfoFeatures
   */
  transition = null;

  /**
   *
   *
   * @memberof PieceInfoFeatures
   */
  members: Array<HTMLElement | null> = [];

  /**
   *
   *
   * @memberof PieceInfoFeatures
   */
  timesUpdated = 0;

  /**
   *
   *
   * @returns
   * @memberof PieceInfoFeatures
   */
  shouldComponentUpdate() {
    // HERE: https://medium.com/@User3141592/react-gotchas-and-best-practices-2d47fd67dd22
    this.timesUpdated++;

    if (this.timesUpdated > 0) {
      return false;
    } else {
      return true;
    }
  }

  /**
   *
   *
   * @param {*} walkthroughObj
   * @returns
   * @memberof PieceInfoFeatures
   */
  getWalkthroughButtons(walkthroughObj: any) {
    let buttons: Array<JSX.Element> = [];
    let urls: Array<any> = [];
    let group = null;

    Object.keys(walkthroughObj).forEach((prop) => {
      if (walkthroughObj[prop] !== "") {
        urls.push(walkthroughObj[prop]);
        buttons.push(
          <a
            className="btn btn-default"
            target="_blank"
            rel="noopener noreferrer"
            key={prop}
            href={urls[urls.length - 1]}
          >
            {prop}
          </a>
        );
      }
    });

    if (buttons.length > 1) {
      group = (
        <div className="btn-group goto_example_group" ref={this.addMember}>
          <div className="btn btn-group-label">Walkthroughs:</div>
          {buttons}
        </div>
      );
    } else if (buttons.length > 0) {
      group = (
        <a
          className="btn btn-default goto_example_btn"
          ref={this.addMember}
          target="_blank"
          rel="noopener noreferrer"
          href={urls[0]}
        >
          Walkthrough
        </a>
      );
    }

    return group;
  }

  /**
   * TODO: Figure out why this member doesn't exist on refs at runtime.
   *
   * @readonly
   * @memberof PieceInfoFeatures
   */
  get height() {
    return this.domElem?.offsetHeight;
  }

  /**
   *
   *
   * @memberof PieceInfoFeatures
   */
  addMember = (member: HTMLElement | null) => {
    if (member && this.members) {
      // TODO: Dunno why this is needed. Figure out later.
      this.members.push(member);
      member.style.transitionDelay = 0.1 + this.members.length * 0.01 + "s";
      member.style.transitionDuration = this.members.length * 0.05 + "s";
    } else {
      // TODO: Figure out how this happens.
      // console.log('eh?');
    }
  };

  /**
   *
   *
   * @memberof PieceInfoFeatures
   */
  componentWillUnmount() {
    setTimeout(() => {
      this.members = [];
    }, 0);
  }

  /**
   *
   *
   * @returns
   * @memberof PieceInfoFeatures
   */
  render() {
    const pieceData = this.props.pieceData;
    const { desc, warnings } = pieceData;
    const { site, desktopSite, walkthroughs, repo, reel } = pieceData.urls;

    const mobileAvailability = pieceData.mobileAvailability;
    const desktopPreferred =
      mobileAvailability === PieceInfoFeatures.DESKTOP_PREFERRED;
    const desktopOnly = mobileAvailability === PieceInfoFeatures.DESKTOP_ONLY;
    const isGame = pieceData.isGame === "1";

    const hasFlash = false;

    const gameButtonStyle = { display: isGame ? "" : "none" };
    const siteButtonStyle = {
      display: !isGame && !(Sniffer.mobile && desktopOnly) ? "" : "none",
    };
    const repoButtonStyle = { display: repo ? "" : "none" };
    const reelButtonStyle = { display: reel ? "" : "none" };

    const gameButtonClass = !hasFlash && desktopOnly ? "disabled" : "";
    const gameButtonClick = void 0;
    const reelURL = reel;
    const repoURL = repo;
    const gameURL = Sniffer.mobile ? site || null : desktopSite || site;

    let warning = null;

    const gameButton = () => {
      const gameButton = (
        <button
          className={"btn btn-default goto_example_btn " + gameButtonClass}
          onClick={gameButtonClick}
          ref={this.addMember}
          style={gameButtonStyle}
        >
          Play Game
        </button>
      );

      return !hasFlash && desktopOnly ? (
        gameButton
      ) : (
        <a
          target="_blank"
          rel="noopener noreferrer"
          ref={this.addMember}
          href={gameURL}
        >
          {gameButton}
        </a>
      );
    };

    const descsDivs = React.Children.map(desc, (paragraph) => {
      return (
        <p className="desc_paragraph" ref={this.addMember}>
          {paragraph}
        </p>
      );
    });

    const warnsDivs = React.Children.map(warnings, (paragraph) => {
      return (
        <p className="desc_paragraph warn_paragraph" ref={this.addMember}>
          {paragraph}
        </p>
      );
    });

    if (desktopPreferred && Sniffer.mobile) {
      warning = (
        <p
          className="mobile_unavailable game_desktop_preferred desc_element"
          ref={this.addMember}
        >
          Best viewed on desktop/laptop browsers.
        </p>
      );
    } else if (!hasFlash && desktopOnly) {
      let link = (
        <a
          href="https://get.adobe.com/flashplayer/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Flash Player
        </a>
      );

      if (Sniffer.mobile) link = <div>Flash Player</div>;

      warning = (
        <p
          ref={this.addMember}
          className="mobile_unavailable game_mobile_unavailable desc_element warn_element"
        >
          Viewable on desktop/laptop browsers (Firefox recommended) with {link}{" "}
          installed.
        </p>
      );
    }

    return (
      <div
        id="piece-info-and-features"
        className="info container"
        ref={(domElem) => {
          this.addMember(domElem);
          this.domElem = domElem;
        }}
      >
        {descsDivs}
        {warnsDivs}

        <div className="my_contribution desc_element" ref={this.addMember}>
          Role:<span className="role"> {pieceData.role}</span>
        </div>

        {warning}

        <div className="features_links">
          {gameButton()}

          <a
            className="btn btn-default goto_example_btn"
            target="_blank"
            ref={this.addMember}
            rel="noopener noreferrer"
            href={desktopSite || site}
            style={siteButtonStyle}
          >
            Visit Site
          </a>
          <a
            className="btn btn-default goto_example_btn"
            target="_blank"
            ref={this.addMember}
            rel="noopener noreferrer"
            href={repoURL}
            style={repoButtonStyle}
          >
            Code Repository
          </a>
          <a
            className="btn btn-default goto_example_btn"
            target="_blank"
            ref={this.addMember}
            rel="noopener noreferrer"
            href={reelURL}
            style={reelButtonStyle}
          >
            Watch Reel
          </a>

          {this.getWalkthroughButtons(walkthroughs)}
        </div>
      </div>
    );
  }
}
