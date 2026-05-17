import type { Metadata } from "next";

import { buildPageMetadata } from "@/app/siteMetadata";
import { getBuildTimeCvExperienceData } from "@/data/CvExperience";

import CvPageClient from "./CvPageClient";

export const revalidate = 86400;
export const metadata: Metadata = buildPageMetadata({
  title: "CV",
  description:
    "Curriculum vitae for Bradley Baysinger, covering frontend engineering, UI systems, production delivery, and recent independent study work.",
  path: "/cv",
});

export default async function CvPage() {
  const {
    summaryHtml,
    coreStrengthsHtml,
    experienceSectionHeading,
    experienceItems,
    recentIndependentStudySectionHeading,
    recentIndependentStudyItems,
  } = await getBuildTimeCvExperienceData();

  return (
    <CvPageClient
      summaryHtml={summaryHtml}
      coreStrengthsHtml={coreStrengthsHtml}
      experienceSectionHeading={experienceSectionHeading}
      initialExperienceItems={experienceItems}
      recentIndependentStudySectionHeading={
        recentIndependentStudySectionHeading
      }
      initialRecentIndependentStudyItems={recentIndependentStudyItems}
    />
  );
}
