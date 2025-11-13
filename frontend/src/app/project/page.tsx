import { notFound, redirect } from "next/navigation";

export const revalidate = 0;

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
  const projectIdRaw = typeof p === "string" ? p : "";
  const projectId = projectIdRaw.replace(/\/+$/u, "");
  if (!projectId) return notFound();
  // Always canonicalize to segment route; client-side code manages carousel state.
  return redirect(`/project/${encodeURIComponent(projectId)}`);
}
