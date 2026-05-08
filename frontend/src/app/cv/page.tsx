import type { Metadata } from "next";

import { buildPageMetadata } from "@/app/siteMetadata";
import type { CvExperienceItemData } from "@/components/cv/ExperienceItem";
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
  try {
    const backendBase = resolveBackendBase();
    const response = await fetch(`${backendBase}/api/cv-experience/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate },
    });

    if (!response.ok) {
      return {
        experienceSectionHeading: 'Experience',
        experienceItems: [],
        recentIndependentStudySectionHeading:
          'Independent R&D and Freelance Front-End Work',
        recentIndependentStudyItems: [],
      };
    }

    const payload = (await response.json()) as CvExperienceResponse;
    if (!payload.success) {
      return {
        experienceSectionHeading: 'Experience',
        experienceItems: [],
        recentIndependentStudySectionHeading:
          'Independent R&D and Freelance Front-End Work',
        recentIndependentStudyItems: [],
      };
    }

    return {
      experienceSectionHeading:
        payload.data?.experienceSectionHeading || 'Experience',
      experienceItems: Array.isArray(payload.data?.experienceItems)
        ? payload.data.experienceItems
        : [],
      recentIndependentStudySectionHeading:
        payload.data?.recentIndependentStudySectionHeading ||
        'Independent R&D and Freelance Front-End Work',
      recentIndependentStudyItems: Array.isArray(
        payload.data?.recentIndependentStudyItems,
      )
        ? payload.data.recentIndependentStudyItems
        : [],
    };
  } catch {
    return {
      experienceSectionHeading: 'Experience',
      experienceItems: [],
      recentIndependentStudySectionHeading:
        'Independent R&D and Freelance Front-End Work',
      recentIndependentStudyItems: [],
    };
  }
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
      recentIndependentStudySectionHeading={recentIndependentStudySectionHeading}
      initialRecentIndependentStudyItems={recentIndependentStudyItems}
    />
  );
}
