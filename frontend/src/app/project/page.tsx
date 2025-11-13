import { notFound, redirect } from "next/navigation";

export const revalidate = 0;
// This page relies on runtime searchParams to canonicalize /project?p=slug
// so it must be dynamic. Otherwise, a static prerender would 404.
export const dynamic = "force-dynamic";

/**
 * Legacy query-param entry point: `/project?p=slug`.
 * Now used only to canonicalize direct hits to the segment route or return 404.
 * In-session navigation still manipulates `?p=` client-side without hitting this.
 */
export default function ProjectQueryPage({
  searchParams,
}: {
  searchParams?: { p?: string | string[] };
}) {
  const param = searchParams?.p;
  const p = Array.isArray(param) ? param[0] : param;
  const projectIdRaw = typeof p === "string" ? p.trim() : "";
  const projectId = projectIdRaw.replace(/\/+$/u, "");
  // Basic slug validation: allow alphanumerics and hyphens only
  const isValid = /^[a-z0-9-]+$/i.test(projectId);
  if (!projectId || !isValid) return notFound();
  // Always canonicalize to segment route with trailing slash; client-side code manages carousel state.
  return redirect(`/project/${encodeURIComponent(projectId)}/`);
}
