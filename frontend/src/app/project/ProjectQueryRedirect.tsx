"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-side query redirect for `/project?p={slug}`.
 *
 * Reads the `p` query param, validates a safe slug shape, and rewrites
 * to the canonical segment route `/project/{slug}/`.
 */
export default function ProjectQueryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const p = (searchParams.get("p") || "").trim().replace(/\/+$/u, "");
    const isValid = /^[a-z0-9-]+$/i.test(p);
    if (!p || !isValid) return;

    router.replace(`/project/${encodeURIComponent(p)}/`);
  }, [router, searchParams]);

  return null;
}
