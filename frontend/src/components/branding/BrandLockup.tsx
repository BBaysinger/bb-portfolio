"use client";

import clsx from "clsx";
import { Fragment, useEffect, useState } from "react";

import { defaultRoleTitle } from "@/app/siteMetadata";
import type { ServerHeroBranding } from "@/data/HeroBranding";

import styles from "./BrandLockup.module.scss";

const LOGO_SRC = "/images/hero/bb-logo.svg";
const LOGO_ALT = "BB Logo";
const DEFAULT_BRANDING: ServerHeroBranding = {
  activeRoleTitle: defaultRoleTitle,
};

const BrandLockup = () => {
  const [branding, setBranding] =
    useState<ServerHeroBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    const controller = new AbortController();

    const loadBranding = async () => {
      try {
        const response = await fetch("/api/hero-branding", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        setBranding((await response.json()) as ServerHeroBranding);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    };

    void loadBranding();

    return () => {
      controller.abort();
    };
  }, []);

  const resolvedRoleTitle = branding.activeRoleTitle.trim();
  const logoElement = (
    <img src={LOGO_SRC} alt={LOGO_ALT} className={styles.logo} />
  );

  return (
    <Fragment>
      {logoElement}
      <div className={styles.text}>
        <div className={styles.name}>
          <span>BRADLEY</span> <span>BAYSINGER</span>
        </div>
        <div>
          <span
            className={clsx(styles.roleTitle, "nobr")}
            style={{ letterSpacing: branding.activeRoleLetterSpacing }}
          >
            {resolvedRoleTitle}
          </span>
        </div>
      </div>
    </Fragment>
  );
};

export default BrandLockup;
