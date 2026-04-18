import ProjectQueryRedirect from "./ProjectQueryRedirect";

export const dynamic = "force-static";
export const revalidate = 3600;

type QuerySearchParams = Record<string, string | string[]>;

export default async function ProjectQueryPage({
  searchParams,
}: {
  searchParams?: Promise<QuerySearchParams>;
}) {
  void searchParams;

  return <ProjectQueryRedirect />;
}
