"use client";

import { useEffect, useState } from "react";

import type { ServerBrandingLockup } from "@/data/BrandingLockup";
import { isHeroRoleTitleClassName } from "@/data/heroRoleTitleClasses";
import { requireTrimmedString } from "@/data/responseValidation";

import BrandLockupView from "./BrandLockupView";

const LOGO_SRC = "/images/hero/bb-logo.svg";
const LOGO_ALT = "BB Logo";

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

  if (!candidate || typeof candidate !== "object") {
    throw new Error("Branding lockup response did not include data.");
  }

  if (!isHeroRoleTitleClassName(candidate.activeRoleTitleClassName)) {
    throw new Error(
      "Branding lockup response missing activeRoleTitleClassName.",
    );
  }

  return {
    activeRoleTitle: requireTrimmedString(
      candidate.activeRoleTitle,
      "activeRoleTitle",
    ),
    activeRoleTitleClassName: candidate.activeRoleTitleClassName,
  };
};

const BrandLockup = () => {
  const [branding, setBranding] = useState<ServerBrandingLockup | null>(null);
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    throw error;
  }

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
        if (!response.ok) {
          throw new Error(
            `Branding lockup fetch failed with status ${response.status}.`,
          );
        }

        setBranding(
          normalizeBrandingPayload(
            (await response.json()) as BrandingLockupResponse,
          ),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setError(
          error instanceof Error
            ? error
            : new Error("Failed to load branding lockup."),
        );
      }
    };

    void loadBranding();

    return () => {
      controller.abort();
    };
  }, []);

  if (!branding) {
    return null;
  }

  if (!branding.activeRoleTitleClassName) {
    throw new Error("Branding lockup missing activeRoleTitleClassName.");
  }

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
