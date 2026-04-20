import clsx from "clsx";
import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";

/**
 * Next.js root layout.
 *
 * Responsibilities:
 * - Defines the top-level `<html>`/`<body>` scaffolding and global CSS imports.
 * - Sets up document metadata needed for mobile safe areas (`viewport-fit=cover`).
 * - Hosts global, app-wide client initializers while keeping this file a server component.
 *
 * Key exports:
 * - Default export `RootLayout` – wraps all routes in the app shell and providers.
 */

import SkipLink from "@/components/common/SkipLink";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { getServerHeroBranding } from "@/data/HeroBranding";
import { roboto } from "@/fonts";

import { AppShell } from "./AppShell";
import { EnvironmentClassInitializer } from "./EnvironmentClassInitializer";
import styles from "./layout.module.scss";
import { AppProviders } from "./providers/AppProviders";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/styles.scss";

const defaultSiteOrigin = "https://bbaysinger.io";

const metadataBase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? defaultSiteOrigin);
  } catch {
    return new URL(defaultSiteOrigin);
  }
})();

const siteTitle = "Bradley Baysinger | Frontend / UI Developer Portfolio";

const siteDescription =
  "Portfolio of Bradley Baysinger, a frontend and UI developer specializing in JavaScript, React, TypeScript, Next.js, interaction systems, animation engineering, and performance-focused web interfaces.";

const siteKeywords = [
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

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: siteTitle,
    template: "%s | Bradley Baysinger",
  },
  description: siteDescription,
  keywords: [...siteKeywords],
  applicationName: "Bradley Baysinger Portfolio",
  authors: [{ name: "Bradley Baysinger", url: defaultSiteOrigin }],
  creator: "Bradley Baysinger",
  publisher: "Bradley Baysinger",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Bradley Baysinger Portfolio",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

/**
 * Root layout component.
 *
 * Provider / initializer ordering notes:
 * - Analytics is wrapped in `Suspense` so it never blocks initial render.
 * - `EnvironmentClassInitializer` runs early to attach env classes to `<html>`.
 * - `SkipLink` is placed near the top of `<body>` for accessibility.
 * - `AppProviders` must wrap `AppShell` so Redux and other contexts are available.
 *
 * @param children - The routed page content.
 */
export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const heroBranding = await getServerHeroBranding();

  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={clsx(roboto.className, styles.body)}>
        {/* Client-only analytics; render as soon as the client can hydrate. */}
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        {/* Side-effect-only initializer (adds environment classes to <html>). */}
        <EnvironmentClassInitializer />
        <SkipLink />
        <AppProviders>
          <AppShell
            initialRoleTitle={heroBranding.activeRoleTitle}
            initialRoleLetterSpacing={heroBranding.activeRoleLetterSpacing}
          >
            {children}
          </AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
