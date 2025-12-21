"use client";

import React, { useEffect, useRef, useState } from "react";

import ProjectsList from "@/components/home-page/ProjectsList";
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
  ssrContainsSanitizedPlaceholders: boolean;
}

export default function HomePageClient({
  ssrProjects,
  ssrProjectRecord,
  ssrIncludeNdaInActive,
  ssrAuthenticated,
  ssrContainsSanitizedPlaceholders,
}: HomePageClientProps) {
  const { isLoggedIn, user, hasInitialized } = useAppSelector((s) => s.auth);
  const clientAuth = isLoggedIn || !!user;
  // Before the client has checked auth, allow SSR-auth to avoid flicker.
  // After initialization (or explicit reset on logout), trust client state.
  const compositeAuth = hasInitialized
    ? clientAuth
    : clientAuth || ssrAuthenticated;
  const [projects, setProjects] =
    useState<ParsedPortfolioProject[]>(ssrProjects);
  const hydratedRef = useRef(false);
  const prevAuthRef = useRef<boolean>(compositeAuth);

  useEffect(() => {
    // Hydrate with SSR metadata so client-side ProjectData matches server auth state.
    ProjectData.hydrate(ssrProjectRecord, ssrIncludeNdaInActive, {
      containsSanitizedPlaceholders: ssrContainsSanitizedPlaceholders,
    });
    hydratedRef.current = true;
  }, [
    ssrProjectRecord,
    ssrIncludeNdaInActive,
    ssrProjects,
    ssrContainsSanitizedPlaceholders,
  ]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!clientAuth) return;
    if (ssrAuthenticated) return;

    let cancelled = false;
    (async () => {
      // If the browser later authenticates, refetch so NDA entries become available client-side.
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

  // When a previously authenticated visitor logs out, re-fetch so NDA data is replaced with placeholders.
  useEffect(() => {
    if (!hydratedRef.current) {
      prevAuthRef.current = compositeAuth;
      return;
    }
    const previouslyAuthed = prevAuthRef.current;
    prevAuthRef.current = compositeAuth;
    if (!(previouslyAuthed && !compositeAuth)) return;

    let cancelled = false;
    (async () => {
      await ProjectData.initialize({
        disableCache: true,
        includeNdaInActive: false,
      });
      if (cancelled) return;
      setProjects([...ProjectData.listedProjects]);
    })();

    return () => {
      cancelled = true;
    };
  }, [compositeAuth]);

  return (
    <ProjectsList
      allProjects={projects}
      isAuthenticated={
        hasInitialized ? clientAuth : clientAuth || ssrAuthenticated
      }
    />
  );
}
