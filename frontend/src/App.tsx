import { Component } from "react";
import { Provider } from "react-redux";
import { Route, Routes } from "react-router";
import { applyMiddleware, combineReducers, compose, createStore } from "redux";

import {
  createRouterMiddleware,
  createRouterReducer,
  ReduxRouter,
  ReduxRouterSelector,
} from "@lagunovsky/redux-react-router";
import ExecutionEnvironment from "exenv";
import { createBrowserHistory } from "history";

import NavBar from "components/NavBar";
import CurriculumVitae from "pages/CurriculumVitae";
import WhoAmI from "pages/WhoAmI";
import PortfolioList from "components/PortfolioList";
import Footer from "components/Footer";
import PieceDetail from "pages/PieceDetail";
import SlideOutNav from "components/SlideOutNav";

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
type State = ReturnType<typeof store.getState>;

/**
 *
 */
const history = createBrowserHistory();

/**
 *
 */
const routerMiddleware = createRouterMiddleware(history);

/**
 *
 */
const rootReducer = combineReducers({
  navigator: createRouterReducer(history),
});

/**
 *
 */
const store = createStore(
  rootReducer,
  compose(applyMiddleware(routerMiddleware))
);

/**
 *
 */
const routerSelector: ReduxRouterSelector<State> = (state) => state.navigator;

/**
 *
 */
class App extends Component<AppProps, AppState> {
  /**
   *
   *
   * @memberof App
   */
  ticking = false;

  /**
   *
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
   * @param {*} e
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
                  element={<PieceDetail pieceId="someId" />}
                ></Route>
                {/* <Route path="/pieces/:pieceId" render={(props) => (
                  <PieceDetail {...props} currentPieceId="someId" />
                )} /> */}
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
