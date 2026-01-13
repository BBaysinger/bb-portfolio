import clsx from "clsx";
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
import { roboto } from "@/fonts";

import { AppShell } from "./AppShell";
import { EnvironmentClassInitializer } from "./EnvironmentClassInitializer";
import styles from "./layout.module.scss";
import { AppProviders } from "./providers/AppProviders";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/styles.scss";

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
export default function RootLayout({ children }: { children: ReactNode }) {
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
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
