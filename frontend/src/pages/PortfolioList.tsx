import React from "react";
import ExecutionEnvironment from "exenv";

import PieceThumbnail from "components/PieceThumbnail";
import HeaderMain from "components/HeaderMain";
import portfolioData from "data/PortfolioData";
import Greeting from "components/Greeting";
import Sniffer from "utils/Sniffer";
import "./PortfolioList.scss";

export default class PortfolioList extends React.Component {
  pieceThumbRefs: Array<React.RefObject<PieceThumbnail | null>> = []; // Allow null

  ticking = false;

  state = { focusedThumbIndex: -1 };

  componentDidMount() {
    document.addEventListener("scroll", this.handleScrollOrResize);
    window.addEventListener("resize", this.handleScrollOrResize);
  }

  componentWillUnmount() {
    document.removeEventListener("scroll", this.handleScrollOrResize);
    window.removeEventListener("resize", this.handleScrollOrResize);
  }

  setThumbRef = (thumbComponent: PieceThumbnail | null, index: number) => {
    if (!this.pieceThumbRefs[index]) {
      this.pieceThumbRefs[index] = React.createRef<PieceThumbnail | null>();
    }
    this.pieceThumbRefs[index].current = thumbComponent;
  };

  handleScrollOrResize = (e: Event) => {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.update(e);
        this.ticking = false;
      });
      this.ticking = true;
    }
  };

  getIndexOfElement = (element: HTMLElement): number => {
    const parent = element.parentNode;

    if (!parent) {
      return -1;
    }

    const siblings = Array.from(parent.children).filter(
      (sibling) => sibling.tagName === element.tagName,
    );

    return siblings.indexOf(element);
  };

  update = (e: Event) => {
    if (ExecutionEnvironment.canUseDOM) {
      if (Sniffer.mobile) {
        let offset;
        let absOffset;
        let bounding;
        let linkHeight;
        let targetMaxOffset;
        let inRange: Array<HTMLElement> = [];

        this.pieceThumbRefs.forEach((thumbRef) => {
          if (thumbRef.current) {
            const thumb: PieceThumbnail = thumbRef.current;
            const domNode: HTMLElement | null = thumb?.getDOMNode();
            if (domNode) {
              bounding = domNode.getBoundingClientRect();
              linkHeight = domNode.offsetHeight;
              targetMaxOffset = linkHeight / 2;
              offset =
                window.innerHeight / 2 - (bounding.top + targetMaxOffset);
              absOffset = Math.abs(offset);

              if (absOffset < targetMaxOffset) {
                inRange.push(domNode);
              }
            }
          }
        });

        inRange.forEach((thumbRef, index) => {
          const thumb = thumbRef;

          if (thumb) {
            bounding = thumb.getBoundingClientRect();
            linkHeight = thumb.offsetHeight / inRange.length;
            const top = bounding.top + linkHeight * index;
            targetMaxOffset = linkHeight / 2;
            offset = window.innerHeight / 2 - (top + targetMaxOffset);
            absOffset = Math.abs(offset);

            if (absOffset < targetMaxOffset) {
              this.setState({
                focusedThumbIndex: this.getIndexOfElement(thumb),
              });
            }
          }
        });
      } else {
        if (e.type === "resize") {
          this.setState({ test: 1, focusedThumbIndex: -1 });
        }
      }
    }
  };

  render() {
    return (
      <div>
        <HeaderMain />
        <div className="portfolio_list">
          {portfolioData.listedPieces.map((pieceData, index) => {
            const id = portfolioData.listedKeys[index];
            const { title, omitFromList, clientId, property, shortDesc, desc } =
              pieceData;

            return (
              <PieceThumbnail
                focused={this.state.focusedThumbIndex === index}
                key={title}
                index={index}
                omitFromList={omitFromList}
                pieceId={id}
                title={title}
                clientId={clientId}
                property={property}
                shortDesc={shortDesc}
                desc={desc}
                ref={(node) => this.setThumbRef(node, index)} // Pass DOM ref
              />
            );
          })}
        </div>
        {/* <Greeting></Greeting> */}
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
              I'm still working on optimizing and adding some projects. At
              present there are changes daily, so please check back
              again&nbsp;soon!
            </p>
          </div>
        </div>
      </div>
    );
  }
}
