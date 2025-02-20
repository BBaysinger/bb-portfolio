import React from "react";

import HeaderMain from "components/home-page/header-main/HeaderMain";
import PortfolioList from "components/home-page/PortfolioList";
import Greeting from "components/home-page/Greeting";

/**
 * Handles bidirectional nature of the interaction between the dynamic route and
 * the carousel. When the carousel is the source of the change, the route is updated,
 * and when the route is the source of the change, the carousel is updated. The changes
 * then propagate to the rest of the components.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const ProjectPage: React.FC = () => {
  return (
    <>
      <HeaderMain />
      <PortfolioList />
      <Greeting />
    </>
  );
};

export default ProjectPage;
