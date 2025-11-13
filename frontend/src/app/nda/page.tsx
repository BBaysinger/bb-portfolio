import { notFound, redirect } from "next/navigation";

export const revalidate = 0;
// This page relies on runtime searchParams to canonicalize /nda?p=slug
// so it must be dynamic. Otherwise, a static prerender would 404.
export const dynamic = "force-dynamic";

/**
 * Legacy query-param entry point: `/nda?p=slug`.
 * Canonicalizes to `/nda/[slug]` (trailing slash) or returns 404 if missing.
 */
export default function NdaQueryPage({
  searchParams,
}: {
  searchParams?: { p?: string | string[] };
}) {
  const param = searchParams?.p;
  const p = Array.isArray(param) ? param[0] : param;
  const projectIdRaw = typeof p === "string" ? p : "";
  const projectId = projectIdRaw.replace(/\/+$/u, "");
  if (!projectId) return notFound();
  // Canonicalize to segment route with trailing slash
  return redirect(`/nda/${encodeURIComponent(projectId)}/`);
}
