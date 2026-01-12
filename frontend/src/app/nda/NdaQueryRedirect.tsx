"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-only redirect helper for NDA deep links.
 *
 * Supports URLs like `/nda?p=<projectId>` by normalizing and redirecting to the canonical
 * App Router dynamic route `/nda/[projectId]`.
 *
 * Security note: `p` is validated to a conservative slug format before redirecting.
 */
export default function NdaQueryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const p = (searchParams.get("p") || "").trim().replace(/\/+$/u, "");
    const isValid = /^[a-z0-9-]+$/i.test(p);
    if (!p || !isValid) return;

    router.replace(`/nda/${encodeURIComponent(p)}/`);
  }, [router, searchParams]);

  return null;
}
