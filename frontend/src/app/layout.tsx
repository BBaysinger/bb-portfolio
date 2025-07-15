"use client";

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

import styles from "./layout.module.scss";
import { AppProviders } from "./providers/AppProviders";
import "@/styles/styles.scss";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <html lang="en">
      <body>
        <AppProviders>
          <div
            ref={fluidRef}
            className={[
              percentHeroInView >= 5 ? "isHeroInView5Pct" : "",
              percentHeroInView >= 100 ? "isHeroInView100Pct" : "",
              isMenuOpen
                ? `isMobileNavExpanded ${styles.isMobileNavExpanded}`
                : "",
            ].join(" ")}
          >
            <NavVariant variant={NavVariants.SLIDE_OUT} />
            <div id="top" style={{ position: "absolute", top: "0px" }}></div>
            <div className={styles.underlay} />
            <div id={styles.main} ref={mainContentRef}>
              <NavVariant variant={NavVariants.TOP_BAR} />
              <ScrollToHash />
              {children}
            </div>
            <Footer mutationElemRef={mainContentRef} />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
