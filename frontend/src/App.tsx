import { Component } from 'react';
import { createRouterMiddleware, createRouterReducer, ReduxRouter, ReduxRouterSelector } from '@lagunovsky/redux-react-router'
import { createBrowserHistory } from 'history'
import { Provider } from 'react-redux'
import { Route } from 'react-router'
import { applyMiddleware, combineReducers, compose, createStore } from 'redux'

import ExecutionEnvironment from "exenv";

import NavBar from "./components/layout/NavBar";
import CurriculumVitae from "./pages/CurriculumVitae";
import WhoAmI from "./pages/WhoAmI";
import PortfolioList from "./pages/PortfolioList";
import Footer from "./components/layout/Footer";
import PieceDetail from "./pages/PieceDetail";
import SlideOutNav from "./components/layout/SlideoutNav";

const history = createBrowserHistory()
const routerMiddleware = createRouterMiddleware(history)

const rootReducer = combineReducers({ navigator: createRouterReducer(history) })

const store = createStore(rootReducer, compose(applyMiddleware(routerMiddleware)))
type State = ReturnType<typeof store.getState>

const routerSelector: ReduxRouterSelector<State> = (state) => state.navigator

// Define the interface for the component's props (if any)
interface MyProps {}

// Define the interface for the component's state
interface MyState {
  slideOut: boolean;
}

class App extends Component<MyProps, MyState> {

  ticking = false;

  constructor() {

    super({});

    this.state = { slideOut: false };

  }

  /**
   *
   *
   * @memberof App
   */
  toggleSlideOutHandler = () => {
    this.setState({
      slideOut: !this.state.slideOut
    });
  }

  /**
   *
   *
   * @memberof App
   */
  collapseSlideOutHandler = () => {
    if (this.state.slideOut) {
      this.setState({
        slideOut: false
      });
    }
  }

  /*
  *
  */
  handleResize = () => {
    this.collapseSlideOutHandler();
  }

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
  }

  /**
   *
   *
   * @memberof App
   */
  componentDidMount() {
    if (ExecutionEnvironment.canUseDOM) {
      window.addEventListener('scroll', this.handleScroll, false);
      window.addEventListener('resize', this.handleResize, false);
    }
  }

  /**
   *
   *
   * @memberof App
   */
  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll, false);
    window.removeEventListener('resize', this.handleResize, false);
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

  render() {
    return (
      <Provider store={store}>
        <ReduxRouter history={history} routerSelector={routerSelector}>
          <SlideOutNav
            collapseSlideOutHandler={this.handleResize}
          ></SlideOutNav>
          <div id="main" style={this.state.slideOut ? { right: this.getRoundedHalfWidth() } : {}}>
            <NavBar
              toggleSlideOutHandler={this.toggleSlideOutHandler}
              collapseSlideOutHandler={this.handleResize}
            ></NavBar>
            <Route path="/">
              <Route path="/" element={<PortfolioList />}></Route>
              <Route path="/portfolio" element={<PortfolioList />}></Route>
              <Route path="/portfolio/:pieceId" element={<PieceDetail pieceId="someId" />}></Route>
              {/* <Route path="/pieces/:pieceId" render={(props) => (
                <PieceDetail {...props} currentPieceId="someId" />
              )} /> */}
              <Route path="/cv" element={<CurriculumVitae />}></Route>
              <Route path="/whoami" element={<WhoAmI />}></Route>
            </Route>
            <Footer></Footer>
          </div>
        </ReduxRouter>
      </Provider>
    )
  }
}

export default App