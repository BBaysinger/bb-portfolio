// app/layout.tsx
"use client";
import React, { useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

import Nav, { NavVariant } from "@/components/layout/Nav";
import Footer from "@/components/layout/Footer";
import ScrollToHash from "@/utils/ScrollToHash";
import { AuthProvider } from "@/context/AuthContext";
import { useTrackHeroInView } from "@/hooks/useTrackHeroInView";
import { useAutoCloseMobileNavOnScroll } from "@/hooks/useAutoCloseMobileNavOnScroll";
import { useFluidPercents } from "@/hooks/useFluidPercents";
import useClientDimensions from "@/hooks/useClientDimensions";

import styles from "./layout.module.scss";
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
        <AuthProvider>
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
            <Nav variant={NavVariant.SLIDE_OUT} />
            <div id="top" style={{ position: "absolute", top: "0px" }}></div>
            <div className={styles.underlay} />
            <div id={styles.main} ref={mainContentRef}>
              <Nav variant={NavVariant.TOP_BAR} />
              <ScrollToHash />
              {children}
            </div>
            <Footer mutationElemRef={mainContentRef} />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
