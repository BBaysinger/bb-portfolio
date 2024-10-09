import ExecutionEnvironment from "exenv";

import React from "react";
import { Link } from "react-router-dom";
// import { useParams } from 'react-router-dom';
import {useNavigate} from 'react-router-dom'

// import { RouteComponentProps } from "react-router-dom";

import HeaderSub from "../components/layout/HeaderSub";
import PieceShot from "../components/PieceShot";
import ClientNames from "../ClientNames";
import Sniffer from "../utils/Sniffer";
import Swipe from "../bb/ui/Swipe";

import portfolioData from "../PortfolioData";
import PieceInfoAndFeatures from "./PieceInfoAndFeatures";

import blankPNG from "../assets/images/misc/blank.png";

import json from "../data/portfolio.json";

type PieceDetailState = {
  scale: number;
  currentPieceId: string;
  transition: string;
  infoHeight: number;
  initialShotImgsLoaded: boolean;
  slide?: string;
};

interface PieceDetailRouterProps {
  pieceId: string;
}

// interface PieceDetailProps {
//   // https://stackoverflow.com/a/46899010/1253298
//   currentPieceId: string;
// }

/**
 * The parent component that owns the different parts of the display of each portfolio item.
 * There are screenshots, paragraphs, and then buttons.
 *
 * Screenshots are displayed within depictions of devices. The paragraphs are sometimes styled
 * differently depending on the type of information. And the buttons
 * that link out to the features available for each portfolio peice. Features and some paragraph types
 * switch on and off, based on flags in the data.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class PieceDetail extends React.Component<PieceDetailRouterProps> {

  navigate = useNavigate();

  static json:any = json;

  /**
   *
   *
   * @static
   * @memberof PieceDetail
   */
  static MOBILE_AVAILABLE = "mobile_available";

  /**
   *
   *
   * @static
   * @memberof PieceDetail
   */
  static SLIDE_LT = "slide_lt";

  /**
   *
   *
   * @static
   * @memberof PieceDetail
   */
  static SLIDE_RT = "slide_rt";

  /**
   *
   *
   * @static
   * @memberof PieceDetail
   */
  static SLIDE_NONE = "slide_none";

  /**
   * Compensates for space needed in slide up upon entering the piece detail page.
   *
   * @static
   * @memberof PieceDetail
   */
  static ANIMATION_PADDING = 70;

  /**
   *
   *
   * @memberof PieceDetail
   */
  swipe = new Swipe();

  /**
   *
   *
   * @memberof PieceDetail
   */
  prevId:string|null = null;

  /**
   *
   *
   * @memberof PieceDetail
   */
  nextId:string|null = null;

  /**
   *
   *
   * @type {Array<JSX.Element>}
   * @memberof PieceDetail
   */
  infoReactElems: Array<JSX.Element> = [];

  /**
   * We're retaining references to some subcomponents merely to inspect their height and
   * adjust for it with a tween. Maybe not ideal, but it's only a side effect.
   *
   * TODO: Determine if there is a better solution.
   *
   * @type {Array<PieceInfoAndFeatures>}
   * @memberof PieceDetail
   */
  infoRefElems: Array<PieceInfoAndFeatures> = [];

  /**
   *
   *
   * @memberof PieceDetail
   */
  numImagesLoaded = 0;

  /**
   *
   *
   * @type {PieceDetailState}
   * @memberof PieceDetail
   */
  public readonly state: PieceDetailState;

  constructor(props:any) {

    super(props);

    this.swipe.swiped.add(this.handleSwiped);

    this.state = {
      currentPieceId: "",
      scale: this.getScale(),
      transition: PieceShot.INIT,
      infoHeight: 0,
      initialShotImgsLoaded: false,
    };

    this.state.currentPieceId = props.match.params.pieceId;

    setTimeout(() => {
      this.setState({
        currentPieceId: props.match.params.pieceId,
        transition: PieceShot.TRANS_IN,
      });
    }, 30); // Delay necessary to trigger React to reflow.
  }

  /**
   *
   *
   * @memberof PieceDetail
   */
  handleSwiped = () => {
    if (this.swipe.swipeDirection === Swipe.SWIPE_LT) {
      this.navigate("/portfolio/" + this.nextId);
    } else if (this.swipe.swipeDirection === Swipe.SWIPE_RT) {
      this.navigate("/portfolio/" + this.prevId);
    }
  };

  /**
   * TODO: Need to revisit this and see if there's a CSS3 solution and
   * take scaling off of state.
   *
   * @returns
   * @memberof PieceDetail
   */
  getScale() {
    let height = window.innerHeight;

    if (Sniffer.mobile) {
      // https://stackoverflow.com/a/16567475/1253298
      if (window.matchMedia("(orientation: portrait)").matches) {
        height = window.screen.height;
      } else {
        height = window.screen.width;
      }
    }

    let min = Math.min(window.innerWidth / 693, height / 600);

    return Math.min(min, 1);
  }

  /**
   *
   *
   * @memberof PieceDetail
   */
  handleResize = () => {
    const pieceIndex: number = this.currentPieceIndex;
    const height = this.infoRefElems[pieceIndex].domElem?.offsetHeight;

    this.setState({
      scale: this.getScale(),
      infoHeight: height,
    });
  };

  /**
   *
   *
   * @readonly
   * @type {number}
   * @memberof PieceDetail
   */
  get currentPieceIndex(): number {
    return Object.keys(portfolioData.activePiecesMap).indexOf(
      this.state.currentPieceId
    );
  }

  /**
   *
   *
   * @memberof PieceDetail
   */
  handleOrientationChange = () => {
    this.setState({ scale: this.getScale() });
  };

  /**
   *
   *
   * @memberof PieceDetail
   */
  componentDidMount() {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("resize", this.handleResize);
      window.addEventListener(
        "orientationchange",
        this.handleOrientationChange
      );
    }

    this.handleResize();

    const swiper = document.getElementById("swiper");

    if (swiper) {
      this.swipe.init([swiper as HTMLElement]);
    }
  }

  /**
   *
   *
   * @memberof PieceDetail
   */
  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener(
      "orientationchange",
      this.handleOrientationChange
    );

    this.swipe.kill();
  }

  /**
   *
   *
   * @param {PieceDetailProps} prevProps
   * @param {PieceDetailState} prevState
   * @memberof PieceDetail
   */
  componentDidUpdate(prevProps: PieceDetailRouterProps, prevState: PieceDetailState) {
    if (prevState.currentPieceId !== this.state.currentPieceId) {
      this.handleResize();
    }

    let newPieceId:string = this.props.pieceId;
    let prevPieceId:string = prevProps.pieceId;

    const prevId:string|null = portfolioData.prevKey(newPieceId);
    const nextId:string|null = portfolioData.nextKey(newPieceId);

    let slideDirection = PieceDetail.SLIDE_NONE;

    if (prevPieceId === prevId) {
      slideDirection = PieceDetail.SLIDE_LT;
    } else if (prevPieceId === nextId) {
      slideDirection = PieceDetail.SLIDE_RT;
    }

    if (newPieceId !== prevPieceId) {
      this.setState({
        slide: slideDirection,
        transition: PieceShot.TRANS_OUT,
      });

      setTimeout(() => {
        this.setState({
          transition: PieceShot.RESET,
        });

        setTimeout(() => {
          this.setState({
            currentPieceId: newPieceId,
            transition: PieceShot.TRANS_IN,
          });
        }, 30); // Timing nessary to trigger React to reflow.
      }, 400);
    }
  }

  /**
   * Once the first two have loaded for the user, trigger the rest to start loading.
   *
   * @memberof PieceDetail
   */
  handleShotImageLoaded = () => {
    this.numImagesLoaded++;
    if (this.numImagesLoaded === 2) {
      this.setState({ initialShotImgsLoaded: true });
    }
  };

  /**
   *
   *
   * @returns
   * @memberof PieceDetail
   */
  render() {
    const pieceId = this.state.currentPieceId;

    if (typeof PieceDetail.json[pieceId] === "undefined") {
      throw new Error("No data associated with " + pieceId);
    }

    const pieceData = PieceDetail.json[pieceId];
    const clientLogos: Array<JSX.Element> = [];

    if (pieceData === undefined) {
      let err =
        "The piece ID '" +
        pieceId +
        "' does not correspond to any portfolio items.";
      console.error(err);
      return <div className="error">{err}</div>;
    }

    this.prevId = portfolioData.prevKey(pieceId);
    this.nextId = portfolioData.nextKey(pieceId);

    const { title, tags, clientId } = pieceData;
    const tagsSpaced = tags.split(",").join(", ");
    const subtitle = tagsSpaced;
    const scale = this.state.scale;
    const pieceShots: Array<JSX.Element> = [];

    /* If phone is turned horizontally (landscape) the devices need scaled down further
    so as to avoid them bleeding off the edges of the viewport */
    const isScaledOnHeight = scale * 693 < window.innerWidth - 100;

    const containerStyle = {
      // Height needs to take into account the slide up upon entering this section.
      height: 500 * scale + 50 + "px",
    };

    const navStyle = { top: 220 * scale + "px" };

    const scaleCSS = {
      transform: "scale(" + scale + "," + scale + ")",
    };

    const navScaleModeClass = isScaledOnHeight
      ? "scaled-on-height"
      : "not-scaled-on-height";

    let keys = Object.keys(ClientNames);

    keys.forEach((key) => {
      let clientLogoURL =
        key === "att" || key === "premera" ? key + "_black" : key;
      clientLogoURL = "url(/images/client-logos/" + clientLogoURL + ".png)";

      const logoStyle = { backgroundImage: clientLogoURL };
      const logoClass = key === clientId ? "visible" : "";

      clientLogos.push(
        <div
          key={key}
          className={"client-logo " + logoClass}
          style={logoStyle}
        ></div>
      );
    });

    let piece: any,
      showMobile,
      id,
      transition = "";
    const activeKeys: Array<string> = portfolioData.activeKeys;

    this.infoReactElems = activeKeys.map((_, i) => {
      piece = portfolioData.activePieces[i];

      showMobile = piece.mobileAvailability === PieceDetail.MOBILE_AVAILABLE;
      id = activeKeys[i];

      transition = PieceShot.RESET;

      if (activeKeys[i] === pieceId) {
        transition = this.state.transition;
      }

      pieceShots[i] = (
        <div
          className={transition}
          key={i}
          onLoad={() => {
            this.handleShotImageLoaded();
          }}
        >
          <PieceShot
            showMobile={showMobile}
            mobileOrientation={piece.mobileOrientation}
            loadImages={
              this.state.initialShotImgsLoaded || activeKeys[i] === pieceId
            }
            id={id}
          />
        </div>
      );

      return (
        <div className={transition} key={i}>
          <PieceInfoAndFeatures
            transition={transition}
            ref={(infoElem) => {
              // NOTE: `ref` functions have different scope in a loop vs in a map!
              if (infoElem) this.infoRefElems[i] = infoElem;
            }}
            pieceData={PieceDetail.json[activeKeys[i]]}
          ></PieceInfoAndFeatures>
        </div>
      );
    });

    const slideDirection = this.state.slide || PieceDetail.SLIDE_NONE;
    const navButtonPrevClass = "nav_button prev ";
    const navButtonNextClass = "nav_button next ";

    return (
      <div className="portfolio_piece">
        <HeaderSub head={title} subhead={subtitle} />

        <div id="main_content" className="portfolio_piece_body">
          {/*///////////////////////////////////////////////////////////////////////////////*/}

          <div className="container logo_container">{clientLogos}</div>

          <div id="portfolioSlideDirection" className={slideDirection}>
            <div id="swiper">
              <div id="full_piece_device_container" style={containerStyle}>
                <div id="full_piece_scaler" style={scaleCSS}>
                  {pieceShots}
                </div>
              </div>
              <div
                id="piece_nav"
                className={navScaleModeClass}
                style={navStyle}
              >
                <div id="nav_button_prev" className={navButtonPrevClass}>
                  <Link to={"/portfolio/" + this.prevId}>
                    <img src={blankPNG} alt="prev button" />
                  </Link>
                </div>
                <div id="nav_button_next" className={navButtonNextClass}>
                  <Link to={"/portfolio/" + this.nextId}>
                    <img src={blankPNG} alt="next button" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <span
            id="infoParent"
            className="container"
            style={{ height: this.state.infoHeight + "px" }}
          >
            {this.infoReactElems}
          </span>

          {/*///////////////////////////////////////////////////////////////////////////////*/}
        </div>
      </div>
    );
  }
}
