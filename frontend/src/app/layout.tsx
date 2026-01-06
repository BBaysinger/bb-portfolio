import clsx from "clsx";
import { ReactNode } from "react";

import SkipLink from "@/components/common/SkipLink";
import { roboto } from "@/fonts";

import { AppShell } from "./AppShell";
import { EnvironmentClassInitializer } from "./EnvironmentClassInitializer";
import styles from "./layout.module.scss";
import { AppProviders } from "./providers/AppProviders";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/styles.scss";

/**
 * Root layout component
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
        {/* 
        <link
          rel="preload"
          as="image"
          href="/spritesheets/lightning_Layer-Comp-_w480h1098f7.webp"
          type="image/webp"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href="/spritesheets/energy-bars_w92h300f110.webp"
          type="image/webp"
          fetchPriority="high"
        />
        */}
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
        {/* <link
          href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;800&display=swap"
          rel="stylesheet"
        /> */}
      </head>
      <body className={clsx(roboto.className, styles.body)}>
        <EnvironmentClassInitializer />
        <SkipLink />
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
