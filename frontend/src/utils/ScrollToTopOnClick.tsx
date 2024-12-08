import { Component, ReactNode } from "react";
import withRouter from "./withRouter";
import { Location } from "react-router-dom";

interface ScrollToTopProps {
  location?: Location;
  children?: ReactNode;
}

// Utility function to check if a path is under a specific base route
const isPortfolioRoute = (path: string) => path.startsWith("/portfolio");

/**
 *
 */
class ScrollToTopOnClick extends Component<ScrollToTopProps> {
  componentDidUpdate(prevProps: ScrollToTopProps) {
    const { location } = this.props;

    if (location && location !== prevProps.location) {
      const currentPath = location.pathname;
      const previousPath = prevProps.location?.pathname || "";

      // Scroll only if NOT navigating between /portfolio routes
      if (!(isPortfolioRoute(currentPath) && isPortfolioRoute(previousPath))) {
        window.scrollTo(0, 0); // Scroll to the top
      }
    }
  }

  render() {
    return this.props.children || null; // Render children or null
  }
}

export default withRouter(ScrollToTopOnClick);
