import React from "react";

import Greeting from "@/components/home-page/Greeting";
import Hero from "@/components/home-page/header-main/Hero";
import HomePageClient from "@/components/home-page/HomePageClient";
import { ProjectDataStore } from "@/data/ProjectData";

/**
 * The home page of the website. Contains the header, greeting, and portfolio list.
 *
 */

// Server component: fetch public (unauthenticated) portfolio data for SSG/ISR.
// Authenticated NDA details are fetched client-side after mount when available.
const HomePage = async () => {
  // Fetch without request headers so the response is always the public view.
  // This is safe to cache and allows SSG/ISR without delaying per-request TTFB.
  const projectData = new ProjectDataStore();
  let initResult: { containsSanitizedPlaceholders?: boolean } = {};
  try {
    initResult = await projectData.initialize({
      disableCache: false,
      includeNdaInActive: false,
    });
  } catch {
    // During static prerender/build, the backend may be unavailable (e.g., CI).
    // Fall back to an empty SSR payload and let the client fetch after mount.
    initResult = { containsSanitizedPlaceholders: false };
  }

  const ssrProjects = projectData.listedProjects;
  const ssrProjectRecord = projectData.projectsRecord;
  const containsSanitizedPlaceholders = Boolean(
    initResult.containsSanitizedPlaceholders,
  );
  const ssrAuthenticated = false;
  const ssrIncludeNdaInActive = false;

  return (
    <>
      <Hero />
      <Greeting />
      <HomePageClient
        ssrProjects={ssrProjects}
        ssrProjectRecord={ssrProjectRecord}
        ssrIncludeNdaInActive={ssrIncludeNdaInActive}
        ssrAuthenticated={ssrAuthenticated}
        ssrContainsSanitizedPlaceholders={containsSanitizedPlaceholders}
      />
    </>
  );
};

export default HomePage;
