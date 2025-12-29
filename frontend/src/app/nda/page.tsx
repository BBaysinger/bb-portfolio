import NdaQueryRedirect from "./NdaQueryRedirect";

// Query-param entry point should be fast and static.
// Canonicalization happens on the client via NdaQueryRedirect.
export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Query-param entry point: `/nda?p=slug`.
 * This exists to support direct hits/share links using `?p=`.
 * In-session carousel navigation updates `?p=` client-side (pushState) without hitting this route.
 * Canonicalizes to `/nda/[slug]` (trailing slash) or returns 404 if missing.
 */
type QuerySearchParams = { [key: string]: string | string[] };

export default async function NdaQueryPage({
  searchParams,
}: {
  searchParams?: Promise<QuerySearchParams>;
}) {
  void searchParams;
  return <NdaQueryRedirect />;
}
