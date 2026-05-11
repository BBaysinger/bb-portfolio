"use client";

import Link from "next/link";

import styles from "./ErrorSurface.module.scss";

type ErrorSurfaceProps = {
  onRetry?: () => void;
  showDocumentShell?: boolean;
};

export function ErrorSurface({
  onRetry,
  showDocumentShell = false,
}: ErrorSurfaceProps) {
  const content = (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrow}>Temporary</span>
          <span className={styles.status}>Error 500</span>
        </div>
        <h1 className={styles.title}>Service interruption</h1>
        <p className={styles.body}>
          The site hit a server-side failure while rendering this page. Please
          try again in a moment.
        </p>
        <div className={styles.actions}>
          {onRetry ? (
            <button className={styles.button} type="button" onClick={onRetry}>
              Retry request
            </button>
          ) : null}
          <Link className={styles.secondaryButton} href="/">
            Go to home
          </Link>
          <Link className={styles.secondaryButton} href="/cv/">
            Open CV
          </Link>
        </div>
        <p className={styles.detail}>
          If the problem persists, the latest release may still be settling.
        </p>
      </section>
    </main>
  );

  if (!showDocumentShell) {
    return content;
  }

  return (
    <html lang="en">
      <body>{content}</body>
    </html>
  );
}