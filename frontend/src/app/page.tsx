"use client";

import React from "react";

import Greeting from "@/components/home-page/Greeting";
import Hero from "@/components/home-page/header-main/Hero";
import PortfolioList from "@/components/home-page/PortfolioList";

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
      <Hero />
      <Greeting />
      <PortfolioList />
    </>
  );
};

export default HomePage;
