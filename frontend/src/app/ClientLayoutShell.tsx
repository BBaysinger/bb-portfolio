"use client";

import clsx from "clsx";
import React, { useRef } from "react";
import { useSelector } from "react-redux";

import Footer from "@/components/layout/Footer";
import NavVariant, { NavVariants } from "@/components/layout/NavVariant";
import { useAutoCloseMobileNavOnScroll } from "@/hooks/useAutoCloseMobileNavOnScroll";
import useClientDimensions from "@/hooks/useClientDimensions";
import { useFluidPercents } from "@/hooks/useFluidPercents";
import { useTrackHeroInView } from "@/hooks/useTrackHeroInView";
import { RootState } from "@/store/store";
import ScrollToHash from "@/utils/ScrollToHash";

import styles from "./ClientLayoutShell.module.scss";

export function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const isMenuOpen = useSelector(
    (state: RootState) => state.ui.isMobileNavExpanded,
  );
  const percentHeroInView = useSelector(
    (state: RootState) => state.ui.percentHeroInView,
  );

  const mainContentRef = useRef<HTMLDivElement>(null);

  useClientDimensions();
  useTrackHeroInView();
  useAutoCloseMobileNavOnScroll();

  const fluidRef = useFluidPercents([
    [320, 680],
    [320, 768],
    [320, 992],
    [360, 1280],
    [360, 1440],
    [320, 1600],
  ]);

  return (
    <div
      ref={fluidRef}
      className={clsx(
        percentHeroInView >= 5 && "isHeroInView5Pct",
        percentHeroInView >= 100 && "isHeroInView100Pct",
        isMenuOpen && ["isMobileNavExpanded", styles.isMobileNavExpanded],
      )}
    >
      <NavVariant variant={NavVariants.SLIDE_OUT} />
      <div id="top" style={{ position: "absolute", top: "0px" }}></div>
      <div className={styles.underlay} />
      <NavVariant variant={NavVariants.TOP_BAR} />
      <div className={styles.main} ref={mainContentRef}>
        <ScrollToHash />
        {children}
      </div>
      <Footer mutationElemRef={mainContentRef} />
    </div>
  );
}
