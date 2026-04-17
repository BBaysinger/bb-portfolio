import { notFound } from "next/navigation";

import ProjectQueryRedirect from "./ProjectQueryRedirect";

type QuerySearchParams = Record<string, string | string[]>;

export default async function ProjectQueryPage({
  searchParams,
}: {
  searchParams?: Promise<QuerySearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const projectId = Array.isArray(resolvedSearchParams?.p)
    ? resolvedSearchParams?.p[0]
    : resolvedSearchParams?.p;

  if (!projectId) {
    notFound();
  }

  return <ProjectQueryRedirect />;
}
