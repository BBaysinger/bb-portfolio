import ProjectQueryRedirect from "./ProjectQueryRedirect";

// Query-param entry point should be fast and static.
// Canonicalization happens on the client via ProjectQueryRedirect.
export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Query-param entry point: `/project?p=slug`.
 * This exists to support direct hits/share links using `?p=`.
 * In-session carousel navigation updates `?p=` client-side (pushState) without hitting this route.
 * In-session navigation still manipulates `?p=` client-side without hitting this.
 */
type QuerySearchParams = { [key: string]: string | string[] };
export default async function ProjectQueryPage({
  searchParams,
}: {
  searchParams?: Promise<QuerySearchParams>;
}) {
  void searchParams;
  return <ProjectQueryRedirect />;
}
