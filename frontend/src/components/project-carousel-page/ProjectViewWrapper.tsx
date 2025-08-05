import ProjectView from "@/components/project-carousel-page/ProjectView";

/**
 * Renders the ProjectView statically with a given projectId.
 * This page is statically generated at build time per projectId.
 */
interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = params;

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
