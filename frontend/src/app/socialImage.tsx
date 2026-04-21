import { headers } from "next/headers";
import { ImageResponse } from "next/og";

import { getServerHeroBranding } from "@/data/HeroBranding";

import { defaultSiteOrigin } from "./siteMetadata";

type SocialImageOptions = {
  width: number;
  height: number;
};

export const runtime = "edge";

const DEVELOPMENT_SITE_ORIGIN = "http://localhost:3000";
const SOCIAL_BACKGROUND_PATH = "/images/social/bg.png";

const BB_LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="327.114" height="565.036" viewBox="0 0 327.114 565.036"><defs><radialGradient id="b" cx="168.217" cy="275.579" r="284.163" gradientUnits="userSpaceOnUse"><stop offset=".443" stop-color="#bdbdbd"/><stop offset="1" stop-color="#7e7f81"/></radialGradient><radialGradient id="c" cx="171.732" cy="283.58" r="285.322" gradientUnits="userSpaceOnUse"><stop offset=".068" stop-color="#c8da30"/><stop offset="1" stop-color="#93c13e"/></radialGradient></defs><path d="M292.639 263.939c-16.33-15.345-35.018-27.533-55.652-36.259-7.928-3.356-16.024-6.132-24.258-8.352 15.444-13.623 25.194-33.552 25.194-55.771 0-41.075-33.297-74.365-74.365-74.365-18.913 0-36.166 7.067-49.284 18.7V7.572C129.824 2.657 146.379 0 163.558 0c90.327 0 163.556 73.23 163.556 163.557 0 37.85-12.881 72.675-34.469 100.382h-.006Z" fill="url(#b)"/><path d="M237.922 401.479c0 41.075-33.297 74.365-74.365 74.365s-74.365-33.296-74.365-74.365 33.297-74.365 74.365-74.365 74.365 33.297 74.365 74.365Zm89.192 0c0-90.327-73.23-163.557-163.557-163.557-37.426 0-74.365-29.423-74.365-74.365V16.224S58.989 30.334 35.679 51.379C11.901 72.849 0 89.155 0 89.155v381.887c19.599 37.476 73.23 93.995 163.557 93.995s163.557-73.23 163.557-163.557Z" fill="url(#c)"/></svg>`,
)}`;

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
  const activeRoleTitle = heroBranding.activeRoleTitle.trim();
  const isWide = width >= 1000;
  const roleCharacters = Array.from(activeRoleTitle);

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
            "linear-gradient(90deg, rgba(2,6,10,0.92) 0%, rgba(2,6,10,0.78) 34%, rgba(2,6,10,0.48) 58%, rgba(2,6,10,0.62) 100%)",
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
            gap: isWide ? 34 : 28,
            maxWidth: 1080,
            width: "100%",
            justifyContent: "center",
          }}
        >
          <img
            src={BB_LOGO_DATA_URI}
            alt="BB logo"
            style={{
              width: isWide ? 88 : 76,
              height: isWide ? 152 : 132,
              objectFit: "contain",
              flexShrink: 0,
              filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.26))",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: isWide ? 12 : 10,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: isWide ? 12 : 10,
                textTransform: "uppercase",
                lineHeight: 0.94,
                fontWeight: 400,
                fontSize: isWide ? 74 : 62,
                letterSpacing: isWide ? "0.045em" : "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "#aeafb3" }}>Bradley</span>
              <span style={{ color: "#9fcf1f" }}>Baysinger</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: isWide ? 790 : 680,
                maxWidth: "100%",
                color: "#f3f6f8",
                fontSize: isWide ? 36 : 30,
                lineHeight: 1.08,
                whiteSpace: "nowrap",
                textShadow: "0 2px 18px rgba(0,0,0,0.28)",
              }}
            >
              {roleCharacters.map((character, index) => (
                <span
                  key={`${character}-${index}`}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    width: character === " " ? (isWide ? 18 : 14) : "auto",
                  }}
                >
                  {character === " " ? "\u00A0" : character}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>,
    {
      width,
      height,
    },
  );
};
