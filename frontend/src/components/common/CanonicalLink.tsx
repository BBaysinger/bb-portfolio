"use client";

/**
 * Canonical link helper (client component).
 *
 * Responsibilities:
 * - Injects a `<link rel="canonical">` tag into the document `<head>`.
 * - Normalizes a potentially relative `href` into an absolute URL.
 *
 * This is useful when the visible URL includes transient query params (e.g. `?p=`)
 * but the canonical shareable URL should be the stable segment route.
 *
 * Key exports:
 * - Default export `CanonicalLink`.
 */

import Head from "next/head";
import { useMemo } from "react";

/**
 * Adds a canonical link to the document head.
 *
 * @param props - Component props.
 * @param props.href - Canonical URL (relative or absolute).
 */
export default function CanonicalLink({ href }: { href: string }) {
  const absoluteHref = useMemo(() => {
    const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN;
    try {
      const base =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : envOrigin || "";
      if (!base) return href; // fallback: relative (still better than nothing)
      const u = new URL(href, base);
      return u.toString();
    } catch {
      return href;
    }
  }, [href]);

  return (
    <Head>
      <link rel="canonical" href={absoluteHref} />
    </Head>
  );
}
