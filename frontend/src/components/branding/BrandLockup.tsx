"use client";

import { useEffect, useState } from "react";

import { defaultRoleTitle } from "@/app/siteMetadata";
import type { ServerHeroBranding } from "@/data/HeroBranding";

import BrandLockupView from "./BrandLockupView";

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

  return (
    <BrandLockupView
      roleTitle={branding.activeRoleTitle}
      roleLetterSpacing={branding.activeRoleLetterSpacing}
      logoSrc={LOGO_SRC}
      logoAlt={LOGO_ALT}
      roleTitleClassName="nobr"
      layout="bare"
    />
  );
};

export default BrandLockup;
