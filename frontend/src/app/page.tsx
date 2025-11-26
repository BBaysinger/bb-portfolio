import React from "react";
// headers() utility removed due to runtime incompatibility; client will fetch with cookies.

import Greeting from "@/components/home-page/Greeting";
import Hero from "@/components/home-page/header-main/Hero";
import HomePageClient from "@/components/home-page/HomePageClient";

/**
 * The home page of the website. Contains the header, greeting, and portfolio list.
 *
 */

// Force dynamic rendering since we fetch from backend API
export const dynamic = "force-dynamic";

// Server component: render client wrapper which handles auth-aware fetch on CSR
const HomePage = async () => {
  return (
    <>
      <Hero />
      <Greeting />
      <HomePageClient />
    </>
  );
};

export default HomePage;
