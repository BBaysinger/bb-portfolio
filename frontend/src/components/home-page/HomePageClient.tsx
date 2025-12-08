"use client";

import React, { useEffect, useRef, useState } from "react";

import PortfolioListStyleSwapper from "@/components/home-page/PortfolioListStyleSwapper";
import ProjectData, {
  ParsedPortfolioProject,
  ParsedPortfolioProjectData,
} from "@/data/ProjectData";
import { useAppSelector } from "@/store/hooks";

interface HomePageClientProps {
  ssrProjects: ParsedPortfolioProject[];
  ssrProjectRecord: ParsedPortfolioProjectData;
  ssrIncludeNdaInActive: boolean;
  ssrAuthenticated: boolean;
}

export default function HomePageClient({
  ssrProjects,
  ssrProjectRecord,
  ssrIncludeNdaInActive,
  ssrAuthenticated,
}: HomePageClientProps) {
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  const clientAuth = isLoggedIn || !!user;
  const [projects, setProjects] =
    useState<ParsedPortfolioProject[]>(ssrProjects);
  const hydratedRef = useRef(false);

  useEffect(() => {
    ProjectData.hydrate(ssrProjectRecord, ssrIncludeNdaInActive);
    hydratedRef.current = true;
  }, [ssrProjectRecord, ssrIncludeNdaInActive, ssrProjects]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!clientAuth) return;
    if (ssrAuthenticated) return;

    let cancelled = false;
    (async () => {
      await ProjectData.initialize({
        disableCache: true,
        includeNdaInActive: true,
      });
      if (cancelled) return;
      setProjects([...ProjectData.listedProjects]);
    })();

    return () => {
      cancelled = true;
    };
  }, [clientAuth, ssrAuthenticated]);

  return (
    <PortfolioListStyleSwapper
      allProjects={projects}
      isAuthenticated={clientAuth || ssrAuthenticated}
    />
  );
}
