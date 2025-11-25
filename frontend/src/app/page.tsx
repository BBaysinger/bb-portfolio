import React from "react";

import Greeting from "@/components/home-page/Greeting";
import Hero from "@/components/home-page/header-main/Hero";
import PortfolioListStyleSwapper from "@/components/home-page/PortfolioListStyleSwapper";
import ProjectData from "@/data/ProjectData";

/**
 * The home page of the website. Contains the header, greeting, and portfolio list.
 *
 */

// Force dynamic rendering since we fetch from backend API
export const dynamic = 'force-dynamic';

// Server component: fetch data and pass to swapper
const HomePage = async () => {
  await ProjectData.initialize();
  const allProjects = [...ProjectData.listedProjects];
  // TODO: Add authentication logic if needed
  return (
    <>
      <Hero />
      <Greeting />
      <PortfolioListStyleSwapper
        allProjects={allProjects}
        isAuthenticated={false}
      />
    </>
  );
};

export default HomePage;
