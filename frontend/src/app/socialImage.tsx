import { ImageResponse } from "next/og";

import { getServerHeroBranding } from "@/data/HeroBranding";

import { siteDescription } from "./siteMetadata";

type SocialImageOptions = {
  width: number;
  height: number;
};

export const runtime = "edge";

export const createPortfolioSocialImage = async ({
  width,
  height,
}: SocialImageOptions) => {
  const heroBranding = await getServerHeroBranding();
  const activeRoleTitle = heroBranding.activeRoleTitle.trim();

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #0c1118 0%, #132333 45%, #223d2a 100%)",
        color: "#f3f6f8",
        padding: "56px 64px",
        fontFamily: "Arial",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "auto -120px -180px auto",
          width: 460,
          height: 460,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(197,255,70,0.28) 0%, rgba(197,255,70,0.08) 45%, rgba(197,255,70,0) 75%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "-120px auto auto -100px",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(77,169,255,0.16) 0%, rgba(77,169,255,0.05) 45%, rgba(77,169,255,0) 72%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 28,
          padding: "44px 48px",
          background: "rgba(8, 12, 18, 0.44)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 92,
              height: 92,
              borderRadius: 22,
              background:
                "linear-gradient(180deg, rgba(207,255,80,1) 0%, rgba(130,180,28,1) 100%)",
              color: "#10160f",
              fontSize: 64,
              fontWeight: 700,
            }}
          >
            b
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 22,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#c7ff46",
              }}
            >
              Bradley Baysinger
            </div>
            <div
              style={{
                fontSize: 26,
                color: "rgba(243,246,248,0.78)",
              }}
            >
              {activeRoleTitle}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: width > 1000 ? 760 : 700,
          }}
        >
          <div
            style={{
              fontSize: width > 1000 ? 64 : 56,
              lineHeight: 1.04,
              fontWeight: 700,
            }}
          >
            Interactive frontend systems with production-grade delivery.
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: "rgba(243,246,248,0.84)",
            }}
          >
            {siteDescription}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {[
            "React",
            "TypeScript",
            "Next.js",
            "Animation Systems",
            "AWS / Terraform",
          ].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 18px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                fontSize: 21,
                color: "rgba(243,246,248,0.92)",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>,
    {
      width,
      height,
    },
  );
};
