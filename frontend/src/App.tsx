import { Component } from "react";
import { Provider } from "react-redux";
import { Route, Routes } from "react-router";
import ExecutionEnvironment from "exenv";

import { ReduxRouter } from "@lagunovsky/redux-react-router";

import store from "store/store";
import { history } from "store/store";
import { routerSelector } from "store/selectors";

import NavBar from "components/NavBar";
import CurriculumVitae from "pages/CurriculumVitae";
import WhoAmI from "pages/WhoAmI";
import SlideOutNav from "components/SlideOutNav2";
import PortfolioList from "components/PortfolioList";
import Footer from "components/Footer";
import PieceDetailWrapper from "pages/PieceDetailWrapper";

import "./App.scss";

/**
 *
 */
interface AppProps {}

/**
 *
 */
interface AppState {
  slideOut: boolean;
}

/**
 *
 */
class App extends Component<AppProps, AppState> {
  /**
   *
   * @memberof App
   */
  ticking = false;

  /**
   *
   * @memberof App
   */
  toggleSlideOutHandler = () => {
    this.setState({
      slideOut: !this.state.slideOut,
    });
  };

  /**
   *
   *
   * @memberof App
   */
  collapseSlideOutHandler = () => {
    if (this.state.slideOut) {
      this.setState({
        slideOut: false,
      });
    }
  };

  /*
   *
   */
  handleResize = () => {
    this.collapseSlideOutHandler();
  };

  /**
   *
   *
   * @memberof App
   */
  handleScroll = () => {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.collapseSlideOutHandler();
        this.ticking = false;
      });
      this.ticking = true;
    }
  };

  /**
   *
   *
   * @memberof App
   */
  componentDidMount() {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener("scroll", this.handleScroll, false);
      window.addEventListener("resize", this.handleResize, false);
    }
  }

  /**
   *
   *
   * @memberof App
   */
  componentWillUnmount() {
    window.removeEventListener("scroll", this.handleScroll, false);
    window.removeEventListener("resize", this.handleResize, false);
  }

  /**
   *
   *
   * @returns
   * @memberof App
   */
  getRoundedHalfWidth() {
    return Math.floor(window.innerWidth / 2) + "px";
  }

  /**
   *
   * @param props
   */
  constructor(props: AppProps) {
    super(props);

    this.state = { slideOut: false };
  }

  /**
   *
   * @returns
   */
  render() {
    return (
      <Provider store={store}>
        <ReduxRouter history={history} routerSelector={routerSelector}>
          <SlideOutNav
            collapseSlideOutHandler={this.handleResize}
          ></SlideOutNav>
          <div
            id="main"
            style={
              this.state.slideOut ? { right: this.getRoundedHalfWidth() } : {}
            }
          >
            <NavBar
              toggleSlideOutHandler={this.toggleSlideOutHandler}
              collapseSlideOutHandler={this.handleResize}
            ></NavBar>
            <Routes>
              <Route path="/">
                <Route path="/" element={<PortfolioList />}></Route>
                <Route path="/portfolio" element={<PortfolioList />}></Route>
                <Route
                  path="/portfolio/:pieceId"
                  element={<PieceDetailWrapper pieceId="someId" />}
                ></Route>
                <Route path="/cv" element={<CurriculumVitae />}></Route>
                <Route path="/whoami" element={<WhoAmI />}></Route>
              </Route>
            </Routes>
            <Footer></Footer>
          </div>
        </ReduxRouter>
      </Provider>
    );
  }
}

export default App;
