/**
 * Public project detail route: `/project/[projectId]`.
 *
 * This page is rendered as SSG/ISR and delegates data fetching + title updates to the client
 * boundary, keeping server-side metadata generation cache-safe.
 *
 * Key exports:
 * - `revalidate` / `dynamicParams` to control ISR behavior.
 * - `generateMetadata` for a safe default title.
 * - Default export `ProjectPage`.
 */

import type { Metadata } from "next";
import { Suspense } from "react";

import ProjectClientBoundary from "./ProjectClientBoundary";

// Allow SSG/ISR for the project detail route.
// NOTE: `revalidate = 0` would make this route dynamic/no-store.
export const revalidate = 3600;
// Allow on-demand generation for unknown params if needed.
export const dynamicParams = true;

/**
 * Provides metadata for the public project route.
 *
 * Keep metadata cache-safe: do not fetch from the backend here.
 * The client sets `document.title` from the hydrated project store.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  void (await params);
  return { title: "Project" };
}

/**
 * Server component wrapper for the project detail page.
 *
 * Renders a suspense boundary around `ProjectClientBoundary`, which handles client-side fetching
 * and any in-app navigation behavior.
 *
 * @param params - Next.js dynamic route params.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <Suspense fallback={<div>Loading project...</div>}>
      <ProjectClientBoundary projectId={projectId} allowNda={false} />
    </Suspense>
  );
}

/**
 * Static params for build-time pre-rendering.
 *
 * Intentionally empty to avoid introducing a build-time backend dependency;
 * `dynamicParams = true` allows ISR on-demand generation.
 */
export async function generateStaticParams() {
  return [];
}
