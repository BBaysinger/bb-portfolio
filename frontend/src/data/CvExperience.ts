import type { CvExperienceItemData } from "@/components/cv/ExperienceItem";
import { resolveBackendBase } from "@/utils/backend-base";

import {
  requireArray,
  requireResponseData,
  requireTrimmedString,
} from "./responseValidation";
import {
  loadStaticContentSnapshot,
  type StaticCvExperienceData,
} from "./StaticContentSnapshot";

type CvExperienceResponse = {
  success?: boolean;
  data?: {
    experienceSectionHeading?: string;
    experienceItems?: CvExperienceItemData[];
    recentIndependentStudySectionHeading?: string;
    recentIndependentStudyItems?: CvExperienceItemData[];
  };
};

const parseCvExperienceResponse = (
  payload: unknown,
): StaticCvExperienceData => {
  const data = requireResponseData<CvExperienceResponse["data"]>(
    payload,
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

export const getCvExperienceData =
  async (): Promise<StaticCvExperienceData> => {
    const snapshot = await loadStaticContentSnapshot();
    if (snapshot?.cvExperience) {
      return parseCvExperienceResponse({
        success: true,
        data: snapshot.cvExperience,
      });
    }

    const backendBase = resolveBackendBase();
    const response = await fetch(`${backendBase}/api/cv-experience/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(
        `CV experience fetch failed with status ${response.status} from ${backendBase}/api/cv-experience/.`,
      );
    }

    return parseCvExperienceResponse(
      (await response.json()) as CvExperienceResponse,
    );
  };
