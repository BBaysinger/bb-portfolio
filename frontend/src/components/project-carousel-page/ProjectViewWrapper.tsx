import ProjectView from "@/components/project-carousel-page/ProjectView";
import { useDynamicPathParam } from "@/hooks/useDynamicPathParam";

/**
 * Renders the ProjectView statically with a given projectId.
 * This page is statically generated at build time per projectId.
 */
interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

/**
 * A server-side wrapper for statically generating a page for each project.
 * This function is invoked by the Next.js App Router during build time
 * for each `projectId` defined in `generateStaticParams`.
 *
 * It delegates rendering to `ProjectViewRouterBridge`, which supports
 * dynamic client-side updates if the route changes via `window.history.pushState()`.
 *
 * @param params - Route parameters provided by Next.js, including the static `projectId`.
 * @returns The rendered page containing the project view.
 */
export default function ProjectViewWrapper({ params }: ProjectPageProps) {
  return <ProjectViewRouterBridge initialProjectId={params.projectId} />;
}

function ProjectViewRouterBridge({
  initialProjectId,
}: {
  initialProjectId: string;
}) {
  const projectId = useDynamicPathParam(-1, initialProjectId); // -1 = last segment of path

  if (!projectId) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h2>Oops! No project ID was provided!</h2>
        <p>This page expects a valid projectId parameter.</p>
      </div>
    );
  }

  return <ProjectView projectId={projectId} />;
}
