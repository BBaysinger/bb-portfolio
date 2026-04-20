import type { Metadata } from "next";

export const defaultSiteOrigin = "https://bbaysinger.io";

const developmentSiteOrigin = "http://localhost:3000";

export const metadataBase = (() => {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim();
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin);
    } catch {
      // Fall through to a deterministic environment-based default.
    }
  }

  return new URL(
    process.env.NODE_ENV === "production"
      ? defaultSiteOrigin
      : developmentSiteOrigin,
  );
})();

export const siteTitle =
  "Bradley Baysinger | Frontend / UI Developer Portfolio";

export const siteDescription =
  "Portfolio of Bradley Baysinger, a frontend and UI developer specializing in JavaScript, React, TypeScript, Next.js, interaction systems, animation engineering, and performance-focused web interfaces.";

export const siteKeywords = [
  "Bradley Baysinger",
  "Bradley Baysinger portfolio",
  "frontend developer portfolio",
  "frontend engineer portfolio",
  "UI developer portfolio",
  "JavaScript developer portfolio",
  "TypeScript developer portfolio",
  "React developer portfolio",
  "Next.js developer portfolio",
  "interactive UI engineer",
  "interactive frontend developer",
  "creative developer portfolio",
  "frontend animation developer",
  "web animation engineer",
  "animation systems engineer",
  "interaction design developer",
  "product UI developer",
  "design systems frontend",
  "accessible frontend development",
  "responsive frontend development",
  "performance-focused frontend",
  "production frontend architecture",
  "frontend architecture",
  "component architecture",
  "custom rendering systems",
  "sprite rendering",
  "parallax carousel",
  "scroll-driven interactions",
  "motion-driven interfaces",
  "immersive web experiences",
  "portfolio case studies",
  "NDA-safe case studies",
  "Payload CMS portfolio",
  "AWS infrastructure frontend",
  "AWS Terraform portfolio",
  "freelance frontend developer",
  "contract frontend developer",
  "frontend execution support",
  "production support frontend",
  "CV and portfolio site",
] as const;

type BuildPageMetadataOptions = {
  title?: Metadata["title"];
  description?: string;
  path?: string;
  robots?: Metadata["robots"];
};

export const buildPageMetadata = ({
  title,
  description,
  path,
  robots,
}: BuildPageMetadataOptions = {}): Metadata => {
  const metadata: Metadata = {};

  if (title) {
    metadata.title = title;
  }

  if (description) {
    metadata.description = description;
  }

  if (robots) {
    metadata.robots = robots;
  }

  if (path) {
    metadata.alternates = { canonical: path };
    metadata.openGraph = {
      url: path,
    };
  }

  return metadata;
};
