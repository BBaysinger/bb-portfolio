import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HOME_HERO_INTRO_REPLAY_REQUESTED_EVENT,
  consumeHomeHeroIntroReplayRequest,
  requestHomeHeroIntroReplay,
  shouldPlayHomeHeroIntroOnEntry,
} from "./homeHeroIntroReplay";

describe("homeHeroIntroReplay", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("persists a replay request without dispatching when asked", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    requestHomeHeroIntroReplay({ dispatchEvent: false });

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(consumeHomeHeroIntroReplayRequest()).toBe(true);
    expect(consumeHomeHeroIntroReplayRequest()).toBe(false);
  });

  it("ignores page-exit replay requests on reload", () => {
    vi.spyOn(window.performance, "getEntriesByType").mockReturnValue([
      { type: "reload" } as PerformanceNavigationTiming,
    ]);

    expect(shouldPlayHomeHeroIntroOnEntry()).toBe(true);
    requestHomeHeroIntroReplay({ dispatchEvent: false, source: "page-exit" });

    expect(shouldPlayHomeHeroIntroOnEntry()).toBe(false);
    expect(consumeHomeHeroIntroReplayRequest()).toBe(false);
  });

  it("still honors explicit replay requests on reload", () => {
    vi.spyOn(window.performance, "getEntriesByType").mockReturnValue([
      { type: "reload" } as PerformanceNavigationTiming,
    ]);

    requestHomeHeroIntroReplay({ dispatchEvent: false, source: "explicit" });

    expect(shouldPlayHomeHeroIntroOnEntry()).toBe(true);
    expect(shouldPlayHomeHeroIntroOnEntry()).toBe(false);
  });

  it("dispatches an immediate replay event by default", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    requestHomeHeroIntroReplay();

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy.mock.calls[0]?.[0]).toBeInstanceOf(CustomEvent);
    expect(
      (dispatchSpy.mock.calls[0]?.[0] as CustomEvent | undefined)?.type,
    ).toBe(HOME_HERO_INTRO_REPLAY_REQUESTED_EVENT);
    expect(consumeHomeHeroIntroReplayRequest()).toBe(true);
  });

  it("plays the intro only once per session unless replay is requested", () => {
    expect(shouldPlayHomeHeroIntroOnEntry()).toBe(true);
    expect(shouldPlayHomeHeroIntroOnEntry()).toBe(false);

    requestHomeHeroIntroReplay({ dispatchEvent: false });

    expect(shouldPlayHomeHeroIntroOnEntry()).toBe(true);
    expect(shouldPlayHomeHeroIntroOnEntry()).toBe(false);
  });
});
