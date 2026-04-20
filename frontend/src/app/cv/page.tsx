import type { Metadata } from "next";
import type { CvExperienceItemData } from "@/components/cv/ExperienceItem";
import { buildPageMetadata } from "@/app/siteMetadata";
import { resolveBackendBase } from "@/utils/backend-base";

import CvPageClient from "./CvPageClient";

export const dynamic = "force-static";
export const revalidate = 86400;
export const metadata: Metadata = buildPageMetadata({
  title: "CV",
  description:
    "Curriculum vitae for Bradley Baysinger, covering frontend engineering, UI systems, production delivery, and recent independent study work.",
  path: "/cv",
});

type CvExperienceResponse = {
  success?: boolean;
  data?: {
    experienceItems?: CvExperienceItemData[];
    recentIndependentStudyItems?: CvExperienceItemData[];
  };
};

const getCvExperienceData = async (): Promise<{
  experienceItems: CvExperienceItemData[];
  recentIndependentStudyItems: CvExperienceItemData[];
}> => {
  try {
    const backendBase = resolveBackendBase();
    const response = await fetch(`${backendBase}/api/cv-experience/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate },
    });

    if (!response.ok) {
      return { experienceItems: [], recentIndependentStudyItems: [] };
    }

    const payload = (await response.json()) as CvExperienceResponse;
    if (!payload.success) {
      return { experienceItems: [], recentIndependentStudyItems: [] };
    }

    return {
      experienceItems: Array.isArray(payload.data?.experienceItems)
        ? payload.data.experienceItems
        : [],
      recentIndependentStudyItems: Array.isArray(
        payload.data?.recentIndependentStudyItems,
      )
        ? payload.data.recentIndependentStudyItems
        : [],
    };
  } catch {
    return { experienceItems: [], recentIndependentStudyItems: [] };
  }
};

export default async function CvPage() {
  const { experienceItems, recentIndependentStudyItems } =
    await getCvExperienceData();

  return (
    <CvPageClient
      initialExperienceItems={experienceItems}
      initialRecentIndependentStudyItems={recentIndependentStudyItems}
    />
  );
}
