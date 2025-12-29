"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const isValidSlug = (s: string): boolean => {
  const trimmed = s.trim().replace(/\/+$/u, "");
  return Boolean(trimmed) && /^[a-z0-9-]+$/i.test(trimmed);
};

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
