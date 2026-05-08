"use client";

import { useEffect, useState } from "react";

import { defaultRoleTitle } from "@/app/siteMetadata";
import type { ServerBrandingLockup } from "@/data/BrandingLockup";
import {
  DEFAULT_HERO_ROLE_TITLE_CLASS_NAME,
  isHeroRoleTitleClassName,
} from "@/data/heroRoleTitleClasses";

import BrandLockupView from "./BrandLockupView";

const LOGO_SRC = "/images/hero/bb-logo.svg";
const LOGO_ALT = "BB Logo";
const DEFAULT_BRANDING: ServerBrandingLockup = {
  activeRoleTitle: defaultRoleTitle,
};

type BrandingLockupResponse =
  | ServerBrandingLockup
  | {
      success?: boolean;
      data?: {
        activeRoleTitle?: unknown;
        activeRoleTitleClassName?: unknown;
      };
    };

type BrandingLockupFields = {
  activeRoleTitle?: unknown;
  activeRoleTitleClassName?: unknown;
};

const normalizeBrandingPayload = (
  payload: BrandingLockupResponse,
): ServerBrandingLockup => {
  let candidate: BrandingLockupFields | undefined;

  if (payload && typeof payload === "object" && "data" in payload) {
    candidate = payload.data;
  } else {
    candidate = payload as ServerBrandingLockup;
  }

  const activeRoleTitle =
    candidate &&
    typeof candidate === "object" &&
    typeof candidate.activeRoleTitle === "string" &&
    candidate.activeRoleTitle.trim()
      ? candidate.activeRoleTitle.trim()
      : defaultRoleTitle;

  const activeRoleTitleClassName =
    candidate &&
    typeof candidate === "object" &&
    isHeroRoleTitleClassName(candidate.activeRoleTitleClassName)
      ? candidate.activeRoleTitleClassName
      : DEFAULT_HERO_ROLE_TITLE_CLASS_NAME;

  return {
    activeRoleTitle,
    activeRoleTitleClassName,
  };
};

const BrandLockup = () => {
  const [branding, setBranding] =
    useState<ServerBrandingLockup>(DEFAULT_BRANDING);

  useEffect(() => {
    const controller = new AbortController();

    const loadBranding = async () => {
      try {
        const response = await fetch("/api/branding-lockup", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        setBranding(
          normalizeBrandingPayload(
            (await response.json()) as BrandingLockupResponse,
          ),
        );
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
      roleTitleStyle={branding.activeRoleTitleClassName}
      logoSrc={LOGO_SRC}
      logoAlt={LOGO_ALT}
      roleTitleClassName="nobr"
      layout="bare"
    />
  );
};

export default BrandLockup;
