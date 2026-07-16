import { revalidatePath, revalidateTag } from "next/cache";

import { CV_CACHE_TAG } from "@/data/cacheTags";

import { createRevalidationHandler } from "../revalidation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const revalidateCvRoutes = () => {
  revalidateTag(CV_CACHE_TAG, "max");
  revalidatePath("/cv", "page");
  revalidatePath("/api/cv-experience", "page");
  return ["/cv", "/api/cv-experience"];
};

export const POST = createRevalidationHandler({
  label: "cv",
  secretEnv: "FRONTEND_REVALIDATE_SECRET",
  revalidate: revalidateCvRoutes,
});
