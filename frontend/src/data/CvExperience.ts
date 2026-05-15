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
    summaryHtml?: string;
    coreStrengthsHtml?: string;
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
    summaryHtml: requireTrimmedString(data?.summaryHtml, "summaryHtml"),
    coreStrengthsHtml: requireTrimmedString(
      data?.coreStrengthsHtml,
      "coreStrengthsHtml",
    ),
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

const fetchCvExperienceDataFromBackend =
  async (): Promise<StaticCvExperienceData> => {
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

export const getCvExperienceData =
  async (): Promise<StaticCvExperienceData> => {
    const snapshot = await loadStaticContentSnapshot();
    if (!snapshot?.cvExperience) {
      throw new Error(
        "Static content snapshot missing cvExperience. The /cv route is snapshot-only and must be built with STATIC_CONTENT_SNAPSHOT_PATH.",
      );
    }

    return parseCvExperienceResponse({
      success: true,
      data: snapshot.cvExperience,
    });
  };

export const getBuildTimeCvExperienceData =
  async (): Promise<StaticCvExperienceData> => {
    const snapshot = await loadStaticContentSnapshot();
    if (snapshot?.cvExperience) {
      return parseCvExperienceResponse({
        success: true,
        data: snapshot.cvExperience,
      });
    }

    return fetchCvExperienceDataFromBackend();
  };
