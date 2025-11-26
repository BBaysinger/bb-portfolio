import { notFound, redirect } from "next/navigation";

export const revalidate = 0;
// This page relies on runtime searchParams to canonicalize /nda?p=slug
// so it must be dynamic. Otherwise, a static prerender would 404.
export const dynamic = "force-dynamic";

/**
 * Legacy query-param entry point: `/nda?p=slug`.
 * Canonicalizes to `/nda/[slug]` (trailing slash) or returns 404 if missing.
 */
type QuerySearchParams = { [key: string]: string | string[] };
export default async function NdaQueryPage({
  searchParams,
}: {
  searchParams?: Promise<QuerySearchParams>;
}) {
  const resolved: QuerySearchParams = (await searchParams) || {};
  const param = resolved.p;
  const p = Array.isArray(param) ? param[0] : param;
  const projectIdRaw = typeof p === "string" ? p.trim() : "";
  const projectId = projectIdRaw.replace(/\/+$/u, "");
  // Basic slug validation: allow alphanumerics and hyphens only
  const isValid = /^[a-z0-9-]+$/i.test(projectId);
  if (!projectId || !isValid) return notFound();
  // Canonicalize to segment route with trailing slash
  return redirect(`/nda/${encodeURIComponent(projectId)}/`);
}
