import ExecutionEnvironment from "exenv";
import React, { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

import HeaderSub from "components/HeaderSub";
import ScreenShot from "components/ScreenShot";
import ClientNames from "data/ClientNames";
import HoverCapabilityWatcher from "utils/HoverCapabilityWatcher";
import Swipe from "utils/Swipe";
import PortfolioDataUtil from "data/PortfolioDataUtil";
import PieceInfoFeatures from "components/PieceInfoFeatures";
import blankPNG from "assets/images/misc/blank.png";
import json from "data/portfolio.json";
import { PortfolioData, PortfolioPieceBase } from "data/portfolioTypes";
import "./PieceDetail.scss";

export type PieceDetailState = {
  scale: number;
  currentPieceId: string;
  transition: string;
  infoHeight: number;
  initialShotImgsLoaded: boolean;
  slide?: string;
};

class Constants {
  static readonly pdJson: PortfolioData = json;
  static readonly SLIDE_LT = "slide_lt";
  static readonly SLIDE_RT = "slide_rt";
  static readonly SLIDE_NONE = "slide_none";
  static readonly ANIMATION_PADDING = 70;
}

const PieceDetail: React.FC<{ pieceId?: string }> = ({
  pieceId: propPieceId,
}) => {
  const params = useParams();
  const pieceId = propPieceId || params.pieceId || "";
  const navigate = useNavigate();

  const getScale = () => {
    let height = window.innerHeight;

    if (!HoverCapabilityWatcher.instance.isHoverCapable) {
      if (window.matchMedia("(orientation: portrait)").matches) {
        height = window.screen.height;
      } else {
        height = window.screen.width;
      }
    }

    let min = Math.min(window.innerWidth / 693, height / 600);

    return Math.min(min, 1);
  };

  const [state, setState] = useState<PieceDetailState>({
    currentPieceId: pieceId,
    scale: getScale(),
    transition: ScreenShot.INIT,
    infoHeight: 0,
    initialShotImgsLoaded: false,
  });

  const swipe = Swipe.instance;
  const infoRefElems = useRef<Array<PieceInfoFeatures | null>>([]);
  const numImagesLoaded = useRef(0);
  const prevId = useRef<string | null>(null);
  const nextId = useRef<string | null>(null);

  useEffect(() => {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleOrientationChange);
    }

    handleResize();

    const swiper = document.getElementById("swiper");

    if (swiper) {
      swipe.init([swiper as HTMLElement]);
      swipe.onSwipe(handleSwiped);
    }

    setState((prevState) => ({
      ...prevState,
      currentPieceId: pieceId,
      transition: ScreenShot.TRANS_IN,
    }));

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
      swipe.kill();
    };
  }, [pieceId]);

  useEffect(() => {
    if (state.currentPieceId !== pieceId) {
      handleResize();
    }

    const newPieceId = pieceId;
    const prevPieceId = state.currentPieceId;

    const prevIdValue = PortfolioDataUtil.prevKey(newPieceId);
    const nextIdValue = PortfolioDataUtil.nextKey(newPieceId);

    let slideDirection = Constants.SLIDE_NONE;

    if (prevPieceId === prevIdValue) {
      slideDirection = Constants.SLIDE_LT;
    } else if (prevPieceId === nextIdValue) {
      slideDirection = Constants.SLIDE_RT;
    }

    if (newPieceId !== prevPieceId) {
      setState((prevState) => ({
        ...prevState,
        slide: slideDirection,
        transition: ScreenShot.TRANS_OUT,
      }));

      setTimeout(() => {
        setState((prevState) => ({
          ...prevState,
          transition: ScreenShot.RESET,
        }));

        setTimeout(() => {
          setState((prevState) => ({
            ...prevState,
            currentPieceId: newPieceId,
            transition: ScreenShot.TRANS_IN,
          }));
        }, 300);
      }, 1000);
    }
  }, [pieceId, state.currentPieceId]);

  const handleSwiped = () => {
    if (swipe.swipeDirection === Swipe.SWIPE_LT) {
      navigate("/portfolio/" + nextId.current);
    } else if (swipe.swipeDirection === Swipe.SWIPE_RT) {
      navigate("/portfolio/" + prevId.current);
    }
  };

  const handleResize = () => {
    const pieceIndex = currentPieceIndex;
    const height = infoRefElems.current[pieceIndex]?.domElem?.offsetHeight
      ? infoRefElems.current[pieceIndex]?.domElem?.offsetHeight + 75
      : 0;

    setState((prevState) => ({
      ...prevState,
      scale: getScale(),
      infoHeight: height,
    }));
  };

  const handleOrientationChange = () => {
    setState((prevState) => ({
      ...prevState,
      scale: getScale(),
    }));
  };

  const handleShotImageLoaded = () => {
    numImagesLoaded.current++;
    if (numImagesLoaded.current === 2) {
      setState((prevState) => ({
        ...prevState,
        initialShotImgsLoaded: true,
      }));
    }
  };

  const currentPieceIndex = Object.keys(
    PortfolioDataUtil.activePiecesMap,
  ).indexOf(state.currentPieceId);

  const pieceIdState = state.currentPieceId;

  if (typeof Constants.pdJson[pieceIdState] === "undefined") {
    throw new Error("No data associated with " + pieceIdState);
  }

  const pieceData: PortfolioPieceBase = Constants.pdJson[pieceIdState];
  const clientLogos: Array<React.ReactNode> = [];

  if (pieceData === undefined) {
    let err =
      "The piece ID '" +
      pieceIdState +
      "' does not correspond to any portfolio items.";
    console.error(err);
    return <div className="error">{err}</div>;
  }

  prevId.current = PortfolioDataUtil.prevKey(pieceIdState);
  nextId.current = PortfolioDataUtil.nextKey(pieceIdState);

  const { title, tags, clientId } = pieceData;
  const tagsSpaced = tags.split(",").join(", ");
  const subtitle = tagsSpaced;
  const scale = state.scale;
  const screenShots: Array<React.ReactNode> = [];

  const isScaledOnHeight = scale * 693 < window.innerWidth - 100;

  const containerStyle = {
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
    clientLogoURL = "url(/images/client-logos/" + clientLogoURL + ".svg)";

    const logoStyle = { backgroundImage: clientLogoURL };
    const logoClass = key === clientId ? "visible" : "";

    clientLogos.push(
      <div
        key={key}
        className={"client-logo " + logoClass}
        style={logoStyle}
      ></div>,
    );
  });

  let piece: PortfolioPieceBase,
    showMobile: boolean,
    id: string,
    transition: string = "";

  const activeKeys: Array<string> = PortfolioDataUtil.activeKeys;

  const infoElems = activeKeys.map((_, i) => {
    piece = PortfolioDataUtil.activePieces[i];

    showMobile = piece.mobileCompatible;
    id = activeKeys[i];

    transition = ScreenShot.RESET;

    if (activeKeys[i] === pieceIdState) {
      transition = state.transition;
    }

    screenShots[i] = (
      <div
        className={transition}
        key={i}
        onLoad={() => {
          handleShotImageLoaded();
        }}
      >
        <ScreenShot
          showMobile={showMobile}
          mobileOrientation={piece.mobileOrientation}
          loadImages={
            state.initialShotImgsLoaded || activeKeys[i] === pieceIdState
          }
          id={id}
        />
      </div>
    );

    return (
      <div className={transition} key={i}>
        <PieceInfoFeatures
          transition={transition}
          ref={(infoElem) => {
            if (infoElem) infoRefElems.current[i] = infoElem;
          }}
          pieceData={Constants.pdJson[activeKeys[i]]}
        ></PieceInfoFeatures>
      </div>
    );
  });

  const slideDirection = state.slide || Constants.SLIDE_NONE;
  const navButtonPrevClass = "nav_button prev ";
  const navButtonNextClass = "nav_button next ";

  return (
    <div id="peiceDetail">
      <HeaderSub head={title} subhead={subtitle} />
      <div id="peiceDetailBody">
        <div className="test">{`currentPieceId: ${state.currentPieceId}`}</div>

        <div className="container logo-container">{clientLogos}</div>
        <div id="portfolioSlideDirection" className={slideDirection}>
          <div id="swiper">
            <div id="full_piece_device_container" style={containerStyle}>
              <div id="full_piece_scaler" style={scaleCSS}>
                {screenShots}
              </div>
            </div>
            <div id="piece_nav" className={navScaleModeClass} style={navStyle}>
              <div id="nav_button_prev" className={navButtonPrevClass}>
                <Link to={"/portfolio/" + prevId.current}>
                  <img src={blankPNG} alt="prev button" />
                </Link>
              </div>
              <div id="nav_button_next" className={navButtonNextClass}>
                <Link to={"/portfolio/" + nextId.current}>
                  <img src={blankPNG} alt="next button" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <span
          id="infoWrapper"
          className="container"
          style={{ height: state.infoHeight + "px" }}
        >
          {infoElems}
        </span>
      </div>
    </div>
  );
};

export default PieceDetail;
