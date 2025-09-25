import React from "react";

import Greeting from "@/components/home-page/Greeting";
import Hero from "@/components/home-page/header-main/Hero";
import ProjectsList from "@/components/home-page/ProjectsList";

/**
 * The home page of the website. Contains the header, greeting, and portfolio list.
 *
 * @author Bradley Baysinger
 * @since 2025
 * @version N/A
 */
const HomePage: React.FC = () => {
  return (
    <>
      <Hero />
      <Greeting />
      <ProjectsList />
    </>
  );
};

export default HomePage;
