/**
 * Query-param entry point for NDA pages: `/nda?p=slug`.
 *
 * This route intentionally stays static and fast:
 * - It does not read `searchParams` on the server.
 * - Canonicalization/redirect happens client-side via `NdaQueryRedirect`.
 *
 * Key exports:
 * - `dynamic` / `revalidate` to enforce static behavior.
 * - Default export `NdaQueryPage`.
 */

import NdaQueryRedirect from "./NdaQueryRedirect";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Type for URL query parameters in Next.js App Router page props.
 */
type QuerySearchParams = Record<string, string | string[]>;

/**
 * Static query-param entry route.
 *
 * Note: we intentionally do not access `searchParams` on the server to preserve static rendering.
 */
export default async function NdaQueryPage({
  searchParams,
}: {
  searchParams?: Promise<QuerySearchParams>;
}) {
  // Intentionally unused; canonicalization occurs on the client.
  void searchParams;
  return <NdaQueryRedirect />;
}
