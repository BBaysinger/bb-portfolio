"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-only redirect helper for NDA-included deep links.
 *
 * Supports URLs like `/nda-included?p=<projectId>` by normalizing and redirecting to the
 * App Router dynamic route `/nda-included/[projectId]`.
 */
export default function NdaIncludedQueryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const p = (searchParams.get("p") || "").trim().replace(/\/+$/u, "");
    const isValid = /^[a-z0-9-]+$/i.test(p);
    if (!p || !isValid) return;

    router.replace(`/nda-included/${encodeURIComponent(p)}/`);
  }, [router, searchParams]);

  return null;
}
