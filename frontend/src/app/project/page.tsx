/**
 * Query-param entry point for public projects: `/project?p=slug`.
 *
 * This route intentionally stays static and fast:
 * - It does not read `searchParams` on the server.
 * - Canonicalization/redirect happens client-side via `ProjectQueryRedirect`.
 *
 * Key exports:
 * - `dynamic` / `revalidate` to enforce static behavior.
 * - Default export `ProjectQueryPage`.
 */

import ProjectQueryRedirect from "./ProjectQueryRedirect";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Type for URL query parameters in Next.js App Router page props.
 */
type QuerySearchParams = Record<string, string | string[]>;

/**
 * Static query-param entry route.
 *
 * This exists to support direct hits/share links using `?p=`.
 */
export default async function ProjectQueryPage({
  searchParams,
}: {
  searchParams?: Promise<QuerySearchParams>;
}) {
  // Intentionally unused; canonicalization occurs on the client.
  void searchParams;
  return <ProjectQueryRedirect />;
}
