/**
 * Query-param entry point for NDA-included pages: `/nda-included?p=slug`.
 *
 * This route stays static and fast:
 * - It does not read `searchParams` on the server.
 * - Canonicalization/redirect happens client-side via `NdaIncludedQueryRedirect`.
 */

import NdaIncludedQueryRedirect from "./NdaIncludedQueryRedirect";

export const dynamic = "force-static";
export const revalidate = 3600;

type QuerySearchParams = Record<string, string | string[]>;

export default async function NdaIncludedQueryPage({
  searchParams,
}: {
  searchParams?: Promise<QuerySearchParams>;
}) {
  void searchParams;
  return <NdaIncludedQueryRedirect />;
}
