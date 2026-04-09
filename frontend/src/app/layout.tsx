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
import { getServerHeroBranding } from "@/data/HeroBranding";
import { roboto } from "@/fonts";

import { AppShell } from "./AppShell";
import { EnvironmentClassInitializer } from "./EnvironmentClassInitializer";
import styles from "./layout.module.scss";
import { AppProviders } from "./providers/AppProviders";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/styles.scss";

const IOS_PRODLIKE_NOTE_DISMISS_KEY = "ios-prodlike-lan-note-dismissed";

const iosProdLikeNoteScript = `(function(){
  try {
    var note = document.getElementById('ios-prodlike-lan-note');
    var dismiss = document.getElementById('ios-prodlike-lan-note-dismiss');
    if (!note || !dismiss || typeof window === 'undefined') return;

    var host = String(window.location.hostname || '').trim().toLowerCase();
    var port = String(window.location.port || '');
    var ua = String((navigator && navigator.userAgent) || '').toLowerCase();
    var platform = String(((navigator && navigator.platform) || '')).toLowerCase();
    var isTouchMac = platform.indexOf('mac') >= 0 && 'ontouchend' in window;
    var isIOS = ua.indexOf('iphone') >= 0 || ua.indexOf('ipad') >= 0 || ua.indexOf('ipod') >= 0 || isTouchMac;
    var isLan = /\\.local$/.test(host) || /^10(?:\\.\\d{1,3}){3}$/.test(host) || /^192\\.168(?:\\.\\d{1,3}){2}$/.test(host) || /^172\\.(1[6-9]|2\\d|3[01])(?:\\.\\d{1,3}){2}$/.test(host);
    var dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem('${IOS_PRODLIKE_NOTE_DISMISS_KEY}') === '1';
    } catch (error) {}

    if (isIOS && isLan && port === '3000' && !dismissed) {
      note.hidden = false;
    }

    dismiss.addEventListener('click', function(){
      try {
        window.sessionStorage.setItem('${IOS_PRODLIKE_NOTE_DISMISS_KEY}', '1');
      } catch (error) {}
      note.hidden = true;
    });
  } catch (error) {}
})();`;

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
        <aside
          id="ios-prodlike-lan-note"
          className={styles.iosProdLikeNote}
          aria-label="iOS LAN testing note"
          hidden
        >
          <p className={styles.iosProdLikeNoteText}>
            iOS LAN note: <strong>:3000</strong> has a known dev-runtime issue.
            Use the prod-like server on <strong>:3004</strong> for validation;
            see <strong>docs/ios-dev-runtime-note.md</strong>.
          </p>
          <button
            id="ios-prodlike-lan-note-dismiss"
            type="button"
            className={styles.iosProdLikeNoteDismiss}
            aria-label="Dismiss iOS LAN testing note"
          >
            Dismiss
          </button>
        </aside>
        <script dangerouslySetInnerHTML={{ __html: iosProdLikeNoteScript }} />
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
