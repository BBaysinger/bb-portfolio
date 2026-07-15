// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BRANDING_CACHE_TAG,
  CONTACT_INFO_CACHE_TAG,
  CV_CACHE_TAG,
  GREETING_CACHE_TAG,
  PROJECTS_CACHE_TAG,
} from "@/data/cacheTags";

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath, revalidateTag }));

import * as cvRoute from "./cv/route";
import * as projectsRoute from "./projects/route";
import * as siteRoute from "./site/route";

const originalEnv = { ...process.env };
const authorizedRequest = {
  headers: new Headers({ authorization: "Bearer expected" }),
} as never;

beforeEach(() => {
  process.env.ENV_PROFILE = "dev";
  process.env.FRONTEND_PROJECTS_REVALIDATE_SECRET = "expected";
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.clearAllMocks();
});

describe("revalidation route coverage", () => {
  it("invalidates project, branding, greeting, layout, and detail caches", async () => {
    await projectsRoute.POST(authorizedRequest);

    expect(revalidateTag).toHaveBeenCalledWith(PROJECTS_CACHE_TAG, "max");
    expect(revalidateTag).toHaveBeenCalledWith(BRANDING_CACHE_TAG, "max");
    expect(revalidateTag).toHaveBeenCalledWith(GREETING_CACHE_TAG, "max");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/project/[projectId]", "page");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/nda-included/[projectId]",
      "page",
    );
  });

  it("invalidates CV data and page caches", async () => {
    await cvRoute.POST(authorizedRequest);

    expect(revalidateTag).toHaveBeenCalledWith(CV_CACHE_TAG, "max");
    expect(revalidatePath).toHaveBeenCalledWith("/cv", "page");
    expect(cvRoute).not.toHaveProperty("GET");
  });

  it("invalidates contact-backed site output", async () => {
    await siteRoute.POST(authorizedRequest);

    expect(revalidateTag).toHaveBeenCalledWith(CONTACT_INFO_CACHE_TAG, "max");
    expect(revalidatePath).toHaveBeenCalledWith("/.well-known/security.txt");
    expect(siteRoute).not.toHaveProperty("GET");
  });
});
