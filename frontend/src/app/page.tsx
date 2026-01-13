import React from "react";

/**
 * Home page route (`/`).
 *
 * Responsibilities:
 * - Renders the hero + greeting.
 * - Performs a server-side fetch of the public (unauthenticated) portfolio dataset
 *   so the page can benefit from SSG/ISR and predictable caching.
 * - Defers authenticated/NDA data to the client to avoid dynamic server rendering
 *   and to prevent any possibility of caching private content.
 *
 * Key exports:
 * - Default export `HomePage` – async server component for the route.
 */

import Greeting from "@/components/home-page/Greeting";
import Hero from "@/components/home-page/header-main/Hero";
import HomePageClient from "@/components/home-page/HomePageClient";
import { ProjectDataStore } from "@/data/ProjectData";

/**
 * Server component for the home page.
 *
 * Fetches only the public dataset server-side so the route remains cacheable.
 * Authenticated/NDA details are fetched client-side after mount when available.
 */
const HomePage = async () => {
  // Fetch without request headers so the response is always the public view.
  // This is safe to cache and allows SSG/ISR without delaying per-request TTFB.
  //
  // Note: We intentionally do NOT try to render the authenticated/NDA dataset here.
  // That dataset depends on per-request cookies; rendering it on the server would
  // make the page dynamic/no-store (or risk leaking NDA content via caching).
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
