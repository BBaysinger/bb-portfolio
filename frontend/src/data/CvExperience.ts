import type { CvExperienceItemData } from "@/components/cv/ExperienceItem";
import {
  normalizeBackendProfile,
  resolveBackendBase,
} from "@/utils/backend-base";

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

export const CV_CACHE_TAG = "cv-experience";

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
    const normalizedProfile = normalizeBackendProfile(
      process.env.ENV_PROFILE || process.env.NODE_ENV || "",
    );
    const isLocalLike =
      normalizedProfile === "local" ||
      normalizedProfile === "dev" ||
      normalizedProfile === "development";
    const response = await fetch(`${backendBase}/api/cv-experience/`, {
      method: "GET",
      headers: { Accept: "application/json" },
      ...(isLocalLike
        ? { cache: "no-store" as const }
        : { next: { revalidate: 86400, tags: [CV_CACHE_TAG] } }),
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
    return fetchCvExperienceDataFromBackend();
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
