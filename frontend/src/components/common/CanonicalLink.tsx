"use client";

import Head from "next/head";
import { useMemo } from "react";

/**
 * CanonicalLink
 * Adds a <link rel="canonical"> to the document head using an absolute URL.
 * Useful when the visible URL uses a transient query param (?p=) but the
 * canonical shareable URL is the segment route (/project/slug/ or /nda/slug/).
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
