import React from "react";

import HeaderMain from "components/home-page/header-main/HeaderMain";
import PortfolioList from "components/home-page/PortfolioList";
import Greeting from "components/home-page/Greeting";

/**
 * The home page of the website. Contains the header, greeting, and portfolio list.
 * 
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
const HomePage: React.FC = () => {
  return (
    <>
      <HeaderMain />
      <Greeting />
      <PortfolioList />
    </>
  );
};

export default HomePage;
