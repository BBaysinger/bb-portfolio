import { describe, expect, it } from "vitest";

import {
  buildHeroViewportRumPayload,
  getHeroViewportSamplePlan,
  parseComputedPixelValue,
} from "./heroViewportDiagnostics";

describe("heroViewportDiagnostics", () => {
  it("uses extended delayed samples for mobile browsers", () => {
    expect(getHeroViewportSamplePlan("ios-safari")).toHaveLength(3);
    expect(getHeroViewportSamplePlan("android-edge")).toHaveLength(3);
    expect(getHeroViewportSamplePlan("mac-safari")).toEqual([
      { delayMs: 150, sampleLabel: "mount-150ms", sampleIndex: 0 },
    ]);
  });

  it("captures rendered size versus viewport size", () => {
    const payload = buildHeroViewportRumPayload({
      viewport: {
        stableHeightPx: null,
        visualViewportHeight: 720,
        visualViewportOffsetTop: 12,
        visualViewportScale: 1,
        innerHeight: 724,
        clientHeight: 724,
      },
      viewportHeightMode: "svh",
      viewportBrowserLabel: "ios-safari",
      sampleLabel: "mount-150ms",
      sampleIndex: 0,
      heroRect: { height: 800, bottom: 800 },
      messageRect: { height: 420, bottom: 430 },
      lockupRect: { top: 620, height: 340, bottom: 760 },
      navRect: { height: 64 },
      computedStyle: {
        height: 800,
        minHeight: 720,
        maxHeight: null,
        paddingTop: 18,
        paddingBottom: 18,
      },
      scrollY: 0,
    });

    expect(payload.mode).toBe("svh");
    expect(payload.browser).toBe("ios-safari");
    expect(payload.referenceViewportHeight).toBe(720);
    expect(payload.visualViewportOffsetTop).toBe(12);
    expect(payload.heroHeight).toBe(800);
    expect(payload.computedMinHeight).toBe(720);
    expect(payload.heroPaddingTop).toBe(18);
    expect(payload.messageHeight).toBe(420);
    expect(payload.lockupHeight).toBe(340);
    expect(payload.availableContentHeight).toBe(684);
    expect(payload.contentStackHeight).toBe(760);
    expect(payload.contentOvershootPx).toBe(76);
    expect(payload.heroOvershootPx).toBe(80);
    expect(payload.suspicious).toBe(true);
    expect(payload.safariSvhMismatch).toBe(true);
  });

  it("parses computed pixel values conservatively", () => {
    expect(parseComputedPixelValue("721.4px")).toBe(721);
    expect(parseComputedPixelValue("auto")).toBeNull();
    expect(parseComputedPixelValue("none")).toBeNull();
    expect(parseComputedPixelValue(undefined)).toBeNull();
  });
});
