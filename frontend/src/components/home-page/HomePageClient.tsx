"use client";

import React, { useEffect, useState } from "react";

import PortfolioListStyleSwapper from "@/components/home-page/PortfolioListStyleSwapper";
import ProjectData, { ParsedPortfolioProject } from "@/data/ProjectData";
import { useAppSelector } from "@/store/hooks";

export default function HomePageClient() {
  const { isLoggedIn, user } = useAppSelector((s) => s.auth);
  const clientAuth = isLoggedIn || !!user;
  const [projects, setProjects] = useState<ParsedPortfolioProject[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Client-side fetch includes cookies automatically; disable cache to avoid NDA leakage
      await ProjectData.initialize({ disableCache: true });
      if (!mounted) return;
      setProjects([...ProjectData.listedProjects]);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PortfolioListStyleSwapper
      allProjects={projects}
      isAuthenticated={clientAuth}
    />
  );
}
