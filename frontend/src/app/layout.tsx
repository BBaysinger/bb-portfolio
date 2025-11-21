import clsx from "clsx";
import { ReactNode, Suspense } from "react";

import SkipLink from "@/components/common/SkipLink";
import { RUMInitializer } from "@/components/RUMInitializer";
import { roboto } from "@/fonts";

import { AppShell } from "./AppShell";
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
        <SkipLink />
        <Suspense fallback={null}>
          <RUMInitializer />
        </Suspense>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
