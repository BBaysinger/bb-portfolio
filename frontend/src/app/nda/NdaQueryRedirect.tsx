"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

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
