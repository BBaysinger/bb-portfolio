// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectDataStore } from "./ProjectData";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

const livePayload = {
  docs: [
    {
      slug: "live-project",
      title: "Live Project",
      active: true,
      omitFromList: false,
      brandId: "live-brand",
      sortIndex: 1,
    },
  ],
};

const makeFetchResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    BACKEND_INTERNAL_URL: "http://backend.test",
    ENV_PROFILE: "prod",
    NODE_ENV: "production",
  };
  delete process.env.NEXT_PHASE;
  delete process.env.PROJECT_DATA_SNAPSHOT_PATH;
});

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("project data snapshots", () => {
  it("ignores PROJECT_DATA_SNAPSHOT_PATH during runtime regeneration", async () => {
    process.env.PROJECT_DATA_SNAPSHOT_PATH = "/tmp/stale-project-snapshot.json";
    const fetchMock = vi.fn(async () => makeFetchResponse(livePayload));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const store = new ProjectDataStore();
    await store.initialize({ includeNdaInActive: false });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://backend.test/api/projects/?depth=2&limit=1000&sort=sortIndex",
    );
    expect(store.getProject("live-project")?.title).toBe("Live Project");
  });
});
