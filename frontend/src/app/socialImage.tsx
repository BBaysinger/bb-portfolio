import { headers } from "next/headers";
import { ImageResponse } from "next/og";

import BrandLockupView from "@/components/branding/BrandLockupView";
import { getServerHeroBranding } from "@/data/HeroBranding";

import { defaultSiteOrigin } from "./siteMetadata";

type SocialImageOptions = {
  width: number;
  height: number;
};

export const runtime = "edge";

const DEVELOPMENT_SITE_ORIGIN = "http://localhost:3000";
const SOCIAL_BACKGROUND_PATH = "/images/social/bg.png";
const LOGO_PATH = "/images/hero/bb-logo.svg";

const resolveRequestOrigin = async () => {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");

  if (host) {
    const proto =
      requestHeaders.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (configuredOrigin) return configuredOrigin.replace(/\/$/, "");

  return process.env.NODE_ENV === "production"
    ? defaultSiteOrigin
    : DEVELOPMENT_SITE_ORIGIN;
};

export const createPortfolioSocialImage = async ({
  width,
  height,
}: SocialImageOptions) => {
  const heroBranding = await getServerHeroBranding();
  const requestOrigin = await resolveRequestOrigin();
  const backgroundImageUrl = `${requestOrigin}${SOCIAL_BACKGROUND_PATH}`;
  const logoImageUrl = `${requestOrigin}${LOGO_PATH}`;
  const activeRoleTitle = heroBranding.activeRoleTitle.trim();
  const isWide = width >= 1000;
  const lockupScale = isWide ? 1.82 : 1.58;
  const roleLetterSpacing =
    heroBranding.activeRoleLetterSpacing?.trim() ||
    (isWide ? "0.1em" : "0.08em");

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#050a10",
        color: "#f3f6f8",
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={backgroundImageUrl}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(2,6,10,0.9) 0%, rgba(2,6,10,0.74) 32%, rgba(2,6,10,0.46) 56%, rgba(2,6,10,0.6) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3,7,13,0.28) 0%, rgba(3,7,13,0.42) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          padding: isWide ? "72px 84px" : "56px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isWide ? "18px 32px 20px" : "16px 26px 18px",
            background: "rgba(6, 10, 14, 0.86)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            boxShadow: "0 18px 42px rgba(0,0,0,0.24)",
            maxWidth: "100%",
            transform: `scale(${lockupScale})`,
            transformOrigin: "center center",
          }}
        >
          <BrandLockupView
            roleTitle={activeRoleTitle}
            roleLetterSpacing={roleLetterSpacing}
            logoSrc={logoImageUrl}
            logoAlt=""
            variant="og"
          />
        </div>
      </div>
    </div>,
    {
      width,
      height,
    },
  );
};
