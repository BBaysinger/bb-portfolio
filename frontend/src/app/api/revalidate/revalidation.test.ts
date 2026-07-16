// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { createRevalidationHandler } from "./revalidation";

const originalEnv = { ...process.env };

const request = (headers: Record<string, string> = {}) =>
  ({ headers: new Headers(headers) }) as never;

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("revalidation handler", () => {
  it("rejects an invalid bearer token without invalidating", async () => {
    process.env.ENV_PROFILE = "dev";
    process.env.FRONTEND_REVALIDATE_SECRET = "expected";
    const revalidate = vi.fn(() => ["/"]);
    const handler = createRevalidationHandler({
      label: "test",
      secretEnv: "FRONTEND_REVALIDATE_SECRET",
      revalidate,
    });

    const response = await handler(
      request({ authorization: "Bearer incorrect" }),
    );

    expect(response.status).toBe(401);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("accepts authenticated POST handling and returns its coverage", async () => {
    process.env.ENV_PROFILE = "dev";
    process.env.FRONTEND_REVALIDATE_SECRET = "expected";
    const revalidate = vi.fn(() => ["/one", "/two"]);
    const handler = createRevalidationHandler({
      label: "test",
      secretEnv: "FRONTEND_REVALIDATE_SECRET",
      revalidate,
    });

    const response = await handler(
      request({ authorization: "Bearer expected" }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      target: "test",
      revalidated: ["/one", "/two"],
    });
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("fails closed without a secret outside local development", async () => {
    process.env.ENV_PROFILE = "prod";
    delete process.env.FRONTEND_REVALIDATE_SECRET;
    const revalidate = vi.fn(() => ["/"]);
    const handler = createRevalidationHandler({
      label: "test",
      secretEnv: "FRONTEND_REVALIDATE_SECRET",
      revalidate,
    });

    const response = await handler(request());

    expect(response.status).toBe(500);
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("treats NODE_ENV=production as nonlocal when ENV_PROFILE is absent", async () => {
    delete process.env.ENV_PROFILE;
    process.env.NODE_ENV = "production";
    delete process.env.FRONTEND_REVALIDATE_SECRET;
    const revalidate = vi.fn(() => ["/"]);
    const handler = createRevalidationHandler({
      label: "test",
      secretEnv: "FRONTEND_REVALIDATE_SECRET",
      revalidate,
    });

    const response = await handler(request());

    expect(response.status).toBe(500);
    expect(revalidate).not.toHaveBeenCalled();
  });
});
