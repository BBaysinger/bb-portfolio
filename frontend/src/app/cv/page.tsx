import type { Metadata } from "next";

import { buildPageMetadata } from "@/app/siteMetadata";
import type { CvExperienceItemData } from "@/components/cv/ExperienceItem";
import {
  requireArray,
  requireResponseData,
  requireTrimmedString,
} from "@/data/responseValidation";
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
    experienceSectionHeading?: string;
    experienceItems?: CvExperienceItemData[];
    recentIndependentStudySectionHeading?: string;
    recentIndependentStudyItems?: CvExperienceItemData[];
  };
};

const getCvExperienceData = async (): Promise<{
  experienceSectionHeading: string;
  experienceItems: CvExperienceItemData[];
  recentIndependentStudySectionHeading: string;
  recentIndependentStudyItems: CvExperienceItemData[];
}> => {
  const backendBase = resolveBackendBase();
  const response = await fetch(`${backendBase}/api/cv-experience/`, {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(
      `CV experience fetch failed with status ${response.status} from ${backendBase}/api/cv-experience/.`,
    );
  }

  const data = requireResponseData<CvExperienceResponse["data"]>(
    (await response.json()) as CvExperienceResponse,
    "CV experience",
  );

  return {
    experienceSectionHeading: requireTrimmedString(
      data?.experienceSectionHeading,
      "experienceSectionHeading",
    ),
    experienceItems: requireArray<CvExperienceItemData>(
      data?.experienceItems,
      "experienceItems",
    ),
    recentIndependentStudySectionHeading: requireTrimmedString(
      data?.recentIndependentStudySectionHeading,
      "recentIndependentStudySectionHeading",
    ),
    recentIndependentStudyItems: requireArray<CvExperienceItemData>(
      data?.recentIndependentStudyItems,
      "recentIndependentStudyItems",
    ),
  };
};

export default async function CvPage() {
  const {
    experienceSectionHeading,
    experienceItems,
    recentIndependentStudySectionHeading,
    recentIndependentStudyItems,
  } = await getCvExperienceData();

  return (
    <CvPageClient
      experienceSectionHeading={experienceSectionHeading}
      initialExperienceItems={experienceItems}
      recentIndependentStudySectionHeading={
        recentIndependentStudySectionHeading
      }
      initialRecentIndependentStudyItems={recentIndependentStudyItems}
    />
  );
}
