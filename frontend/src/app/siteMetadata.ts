import type { Metadata } from "next";

export const defaultSiteOrigin = "https://bbaysinger.io";
export const siteOwnerName = "Bradley Baysinger";
export const socialImageAlt =
  "Bradley Baysinger frontend and UI developer portfolio social preview";

const developmentSiteOrigin = "http://localhost:3000";
const openGraphImagePath = "/opengraph-image";
const twitterImagePath = "/twitter-image";

const openGraphImages: NonNullable<Metadata["openGraph"]>["images"] = [
  {
    url: openGraphImagePath,
    width: 1200,
    height: 630,
    alt: socialImageAlt,
  },
];

const twitterImages: NonNullable<Metadata["twitter"]>["images"] = [
  {
    url: twitterImagePath,
    width: 1200,
    height: 600,
    alt: socialImageAlt,
  },
];

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

export const defaultRoleTitle = "Front-End / UI Developer";

export const siteTitle = `${siteOwnerName} | ${defaultRoleTitle}`;

export const buildSectionTitle = (pageTitle?: string): string => {
  const normalizedPageTitle = pageTitle?.trim();
  if (!normalizedPageTitle) return siteOwnerName;
  if (normalizedPageTitle.includes(siteOwnerName)) return normalizedPageTitle;
  return `${normalizedPageTitle} | ${siteOwnerName}`;
};

export const buildHomePageTitle = (roleTitle?: string): string => {
  const normalizedRoleTitle = roleTitle?.trim();
  if (!normalizedRoleTitle) return siteTitle;
  return `${siteOwnerName} | ${normalizedRoleTitle}`;
};

export const buildProjectPageTitle = (project?: {
  longTitle?: string;
  title?: string;
}): string => {
  const normalizedLongTitle = project?.longTitle?.trim();
  if (normalizedLongTitle) return buildSectionTitle(normalizedLongTitle);

  const normalizedTitle = project?.title?.trim();
  if (normalizedTitle) return buildSectionTitle(normalizedTitle);

  return buildSectionTitle("Project");
};

export const siteDescription =
  "Portfolio of Bradley Baysinger, a frontend and UI developer specializing in JavaScript, React, TypeScript, Next.js, interaction systems, animation engineering, and performance-focused web interfaces.";

export const siteHandle = "Bradley Baysinger Portfolio";

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
  title?: string;
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
  const resolvedTitle = title ? buildSectionTitle(title) : siteTitle;
  const resolvedDescription = description ?? siteDescription;

  const metadata: Metadata = {
    title: resolvedTitle,
    description: resolvedDescription,
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: twitterImages,
    },
  };

  if (robots) {
    metadata.robots = robots;
  }

  if (path) {
    metadata.alternates = { canonical: path };
    metadata.openGraph = {
      ...metadata.openGraph,
      url: path,
    };
  }

  return metadata;
};
