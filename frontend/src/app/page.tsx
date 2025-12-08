import { headers } from "next/headers";
import React from "react";

import Greeting from "@/components/home-page/Greeting";
import Hero from "@/components/home-page/header-main/Hero";
import HomePageClient from "@/components/home-page/HomePageClient";
import ProjectData from "@/data/ProjectData";

/**
 * The home page of the website. Contains the header, greeting, and portfolio list.
 *
 */

// Force dynamic rendering since we fetch from backend API
export const dynamic = "force-dynamic";

const hasPayloadSession = (headerList: Headers) => {
  const cookieHeader = headerList.get("cookie") || "";
  return /(?:^|;\s*)payload-token=/.test(cookieHeader);
};

// Server component: fetch portfolio data with request context for SSR gating
const HomePage = async () => {
  const headerList = await headers();
  const forwardedHeaders = new Headers();
  headerList.forEach((value, key) => {
    forwardedHeaders.append(key, value);
  });
  const hasSessionCookie = hasPayloadSession(forwardedHeaders);

  await ProjectData.initialize({
    headers: forwardedHeaders,
    disableCache: true,
  });

  const ssrProjects = ProjectData.listedProjects;
  const ssrProjectRecord = ProjectData.projectsRecord;
  // Only trust the cookie when the response contains full NDA data (no sanitized placeholders).
  const containsSanitizedPlaceholders = ssrProjects.some(
    (project) => project?.isSanitized,
  );
  const ssrAuthenticated = hasSessionCookie && !containsSanitizedPlaceholders;
  const ssrIncludeNdaInActive = ssrAuthenticated
    ? ProjectData.includeNdaInActive
    : false;

  return (
    <>
      <Hero />
      <Greeting />
      <HomePageClient
        ssrProjects={ssrProjects}
        ssrProjectRecord={ssrProjectRecord}
        ssrIncludeNdaInActive={ssrIncludeNdaInActive}
        ssrAuthenticated={ssrAuthenticated}
      />
    </>
  );
};

export default HomePage;
