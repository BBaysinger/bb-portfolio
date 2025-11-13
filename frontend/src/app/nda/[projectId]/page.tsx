import type { Metadata } from "next";
import { Suspense } from "react";

import ProjectViewWrapper from "@/components/project-carousel-page/ProjectViewWrapper";

export const revalidate = 0;
export const dynamicParams = true;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NdaProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { projectId } = params;
  // Client controls NDA visibility based on auth; page stays static to avoid SSR auth mismatches.
  return (
    <Suspense fallback={<div>Loading NDA project...</div>}>
      <ProjectViewWrapper params={{ projectId }} allowNda={true} />
    </Suspense>
  );
}

export async function generateStaticParams() {
  return [];
}
