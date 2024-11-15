import React from "react";
import ReactDOM from "react-dom";

import PieceThumbnail from "components/PieceThumbnail";
import HeaderMain from "components/HeaderMain";

import portfolioData from "../PortfolioData";
import ExecutionEnvironment from "exenv";
import Sniffer from "../utils/Sniffer";

import "./PortfolioList.scss";

/**
 * The list of portfolio pieces, each represented by buttons/thumbnails on the home/portfolio page that are
 * focused when they are either rolled over or scrolled to the vertical middle of the viewport.
 * On mobile/touch devices, the thumbnail closest to the middle of the viewport is focused in single column,
 * or if there are multiple columns, the focus proceeds through
 * items in each row from left to right when scrolling downward (or opposite).
 * That is determined by using math from scroll position.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version 0.1.0
 */
export default class PortfolioList extends React.Component {
  /**
   *
   *
   * @memberof PortfolioList
   */
  pieceThumbRefs: Array<PieceThumbnail> = [];

  /**
   *
   *
   * @memberof PortfolioList
   */
  ticking = false;

  /**
   *
   *
   * @memberof PortfolioList
   */
  state = { focusedThumbIndex: -1 };

  /**
   *
   *
   * @memberof PortfolioList
   */
  componentDidMount() {
    document.addEventListener("scroll", this.handleScrollOrResize);
    window.addEventListener("resize", this.handleScrollOrResize);
  }

  /**
   *
   *
   * @memberof PortfolioList
   */
  componentWillUnmount() {
    document.removeEventListener("scroll", this.handleScrollOrResize);
    window.removeEventListener("resize", this.handleScrollOrResize);
  }

  /**
   *
   * @param {*} thumbComponent
   */
  setThumbRef = (thumbComponent: PieceThumbnail) => {
    this.pieceThumbRefs.push(thumbComponent);
  };

  /**
   *
   *
   * @param {*} e
   */
  handleScrollOrResize = (e: Event) => {
    if (!this.ticking) {
      // A best practice that can help performance for processes that
      // may cause dropped frames on scroll.
      window.requestAnimationFrame(() => {
        this.update(e);
        this.ticking = false;
      });
      this.ticking = true;
    }
  };

  /**
   *
   * @param element
   * @returns
   */
  getIndexOfElement = (element: HTMLElement): number => {
    // Get the parent node
    const parent = element.parentNode;

    // If the parent does not exist, return -1
    if (!parent) {
      return -1;
    }

    // Get all children of the parent that are of the same type (tag name)
    const siblings = Array.from(parent.children).filter(
      (sibling) => sibling.tagName === element.tagName
    );

    // Find the index of the element in the siblings array
    return siblings.indexOf(element);
  };

  /**
   *
   *
   * @param {*} e
   * @memberof PortfolioList
   */
  update = (e: Event) => {
    if (ExecutionEnvironment.canUseDOM) {
      if (Sniffer.mobile) {
        let offset;
        let absOffset;
        let bounding;
        let thumbDOMNode: HTMLElement;
        let linkHeight;
        let targetMaxOffset;
        /* The row closest to vertical middle. */
        let inRange: Array<PieceThumbnail> = [];

        // Collect the 1, 2, or 3 (of a row) that are closest to the middle of the viewport.
        this.pieceThumbRefs.forEach((thumbRef, index) => {
          // TODO: Should be able to ref a member of this component rather
          // than reaching for the child's DOM node? 🤔
          thumbDOMNode = ReactDOM.findDOMNode(
            this.pieceThumbRefs[index]
          ) as HTMLElement;
          bounding = thumbDOMNode?.getBoundingClientRect();
          linkHeight = thumbDOMNode.offsetHeight;
          targetMaxOffset = linkHeight / 2;
          offset = window.innerHeight / 2 - (bounding.top + targetMaxOffset);
          absOffset = Math.abs(offset);

          if (absOffset < targetMaxOffset) {
            inRange.push(thumbRef);
          }
        });

        // Loop over the ones in range to see which one to focus.
        inRange.forEach((thumbRef, index) => {
          thumbDOMNode = ReactDOM.findDOMNode(thumbRef) as HTMLElement;
          bounding = thumbDOMNode.getBoundingClientRect();
          linkHeight = thumbDOMNode.offsetHeight / inRange.length;
          let top = bounding.top + linkHeight * index;
          targetMaxOffset = linkHeight / 2;
          offset = window.innerHeight / 2 - (top + targetMaxOffset);
          absOffset = Math.abs(offset);

          if (absOffset < targetMaxOffset) {
            this.setState({
              focusedThumbIndex: this.getIndexOfElement(thumbDOMNode),
            });
          }
        });
      } else {
        if (e.type === "resize") {
          // Force reset to hover mode.
          this.setState({ test: 1, focusedThumbIndex: -1 });
        }
      }
    }
  };

  /**
   *
   *
   * @returns
   * @memberof PortfolioList
   */
  render() {
    return (
      <div>
        <HeaderMain />
        <div className="portfolio_list">
          {portfolioData.listedPieces.map((pieceData, index) => {
            let id = portfolioData.listedKeys[index];
            let { title, omitFromList, clientId, property, shortDesc, desc } =
              pieceData;

            return (
              <PieceThumbnail
                focused={this.state.focusedThumbIndex === index}
                key={title} //facebook.github.io/react/docs/multiple-components.html#dynamic-children
                index={index}
                omitFromList={omitFromList}
                pieceId={id}
                title={title}
                clientId={clientId}
                property={property}
                shortDesc={shortDesc}
                desc={desc}
                ref={this.setThumbRef}
              />
            );
          })}
        </div>
        <div className="list_note">
          <div className="container">
            <h3>Welcome!</h3>

            <p>
              I am a developer with over six years in web UI and front-end
              frameworks and eleven years in related interactive programming.
              Since landing a spot in a top-tier digital advertising agency
              nearly straight out of design school in 2005, I have passionatly
              pursued interactive programming of various sorts, and the quality
              results have been as unending as the prolific projects slung
              my&nbsp;direction.
            </p>

            <p>
              Inventing and learning have been constant, and every deadline has
              been somewhere between unreasonable and insane. Through this path
              I've gained a unique understanding of UX/UI, front-end, and
              working with ever-changing teams and&nbsp;processes.
            </p>

            <p>
              Meticulous perfectionism, adherence to best practices, and
              flexible solutions have been my strength and preference as time
              permits, but what's brought me fantastic opportunities has been my
              unending passion for breathing life into beautiful concepts. I'm
              always ready to build more great&nbsp;things.
            </p>

            <p>
              My portfolio spans many years and types of technologies, and given
              the nature, it would be a shame to exclude all projects that may
              no longer be 100% relevant to my current direction, so I've opted
              to show a taste of the older stuff; though it's tough that eight
              years of Flash projects can no longer be deployed on the&nbsp;web.
            </p>

            <p>
              I'm still working on adding newer projects, but that's often a
              challenge, since not everything is public-facing and functionally
              standalone. But check back soon, and send me any questions you
              that come to&nbsp;mind!
            </p>
          </div>
        </div>
      </div>
    );
  }
}
