import { revalidatePath, revalidateTag } from "next/cache";

import {
  BRANDING_CACHE_TAG,
  GREETING_CACHE_TAG,
  PROJECTS_CACHE_TAG,
} from "@/data/cacheTags";

import { createRevalidationHandler } from "../revalidation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const revalidateProjectRoutes = () => {
  revalidateTag(PROJECTS_CACHE_TAG, "max");
  revalidateTag(BRANDING_CACHE_TAG, "max");
  revalidateTag(GREETING_CACHE_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/", "page");
  revalidatePath("/project", "page");
  revalidatePath("/project/[projectId]", "page");
  revalidatePath("/nda-included", "page");
  revalidatePath("/nda-included/[projectId]", "page");

  return [
    "/ (layout)",
    "/",
    "/project",
    "/project/[projectId]",
    "/nda-included",
    "/nda-included/[projectId]",
  ];
};

export const POST = createRevalidationHandler({
  label: "projects",
  secretEnv: "FRONTEND_REVALIDATE_SECRET",
  revalidate: revalidateProjectRoutes,
});
