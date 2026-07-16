import { revalidatePath, revalidateTag } from "next/cache";

import { CONTACT_INFO_CACHE_TAG } from "@/data/cacheTags";

import { createRevalidationHandler } from "../revalidation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const revalidateSiteRoutes = () => {
  revalidateTag(CONTACT_INFO_CACHE_TAG, "max");
  revalidatePath("/.well-known/security.txt");
  return ["/.well-known/security.txt"];
};

export const POST = createRevalidationHandler({
  label: "site",
  secretEnv: "FRONTEND_REVALIDATE_SECRET",
  revalidate: revalidateSiteRoutes,
});
