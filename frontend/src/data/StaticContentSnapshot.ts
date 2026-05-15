import type { CvExperienceItemData } from "@/components/cv/ExperienceItem";

import type { ServerBrandingLockup } from "./BrandingLockup";
import type { ServerGreeting } from "./Greeting";

export type StaticCvExperienceData = {
  summaryHtml: string;
  coreStrengthsHtml: string;
  experienceSectionHeading: string;
  experienceItems: CvExperienceItemData[];
  recentIndependentStudySectionHeading: string;
  recentIndependentStudyItems: CvExperienceItemData[];
};

export type StaticContentSnapshotEnvelope = {
  brandingLockup: ServerBrandingLockup;
  greeting: ServerGreeting;
  cvExperience: StaticCvExperienceData;
  generatedAt: string;
  sourceProfile: string;
};

const runtimeImport = <T>(specifier: string): Promise<T> => {
  const loader = Function(
    "moduleSpecifier",
    "return import(moduleSpecifier);",
  ) as (moduleSpecifier: string) => Promise<T>;
  return loader(specifier);
};

const loadSnapshotText = async (snapshotPath: string): Promise<string> => {
  type ReadFileFn = (path: string, encoding: string) => Promise<string>;

  let readFile: ReadFileFn | undefined;
  try {
    const fsPromises = await runtimeImport<{ readFile?: ReadFileFn }>(
      "fs/promises",
    );
    readFile = fsPromises.readFile;
  } catch {
    const fsModule = await runtimeImport<{
      promises?: { readFile?: ReadFileFn };
    }>("fs");
    readFile = fsModule.promises?.readFile;
  }

  if (!readFile) {
    throw new Error("Node fs readFile is unavailable in this runtime");
  }

  return readFile(snapshotPath, "utf8");
};

const parseStaticContentSnapshot = (
  payload: unknown,
): StaticContentSnapshotEnvelope => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(
      "Static content snapshot must be an object envelope with branding, greeting, and CV sections.",
    );
  }

  const snapshot = payload as Partial<StaticContentSnapshotEnvelope>;
  if (!snapshot.brandingLockup || typeof snapshot.brandingLockup !== "object") {
    throw new Error("Static content snapshot missing brandingLockup.");
  }
  if (!snapshot.greeting || typeof snapshot.greeting !== "object") {
    throw new Error("Static content snapshot missing greeting.");
  }
  if (!snapshot.cvExperience || typeof snapshot.cvExperience !== "object") {
    throw new Error("Static content snapshot missing cvExperience.");
  }

  return snapshot as StaticContentSnapshotEnvelope;
};

let staticContentSnapshotPromise: Promise<StaticContentSnapshotEnvelope | null> | null =
  null;

export const loadStaticContentSnapshot =
  async (): Promise<StaticContentSnapshotEnvelope | null> => {
    if (typeof window !== "undefined") {
      return null;
    }

    if (!staticContentSnapshotPromise) {
      staticContentSnapshotPromise = (async () => {
        const snapshotPath = process.env.STATIC_CONTENT_SNAPSHOT_PATH?.trim();
        if (!snapshotPath) {
          return null;
        }

        const raw = await loadSnapshotText(snapshotPath);
        const parsed = JSON.parse(raw) as unknown;
        return parseStaticContentSnapshot(parsed);
      })();
    }

    return staticContentSnapshotPromise;
  };
