"use client";

/**
 * Client-side redirect helper for legacy/deep-link project URLs.
 *
 * Supports query-based entry links like `/project?p=<slug>` by normalizing the `p` value and
 * redirecting to the canonical App Router dynamic route `/project/[projectId]`.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Validates an incoming project slug.
 *
 * This is intentionally conservative to avoid redirecting to unexpected paths.
 */
const isValidSlug = (s: string): boolean => {
  const trimmed = s.trim().replace(/\/+$/u, "");
  return Boolean(trimmed) && /^[a-z0-9-]+$/i.test(trimmed);
};

/**
 * Normalizes `?p=` and redirects to the canonical project route.
 */
export default function ProjectQueryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = searchParams.get("p") || "";
    const slug = raw.trim().replace(/\/+$/u, "");
    if (!isValidSlug(slug)) return;
    router.replace(`/project/${encodeURIComponent(slug)}/`);
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: "50vh" }}>
      <p>Loading project…</p>
    </div>
  );
}
