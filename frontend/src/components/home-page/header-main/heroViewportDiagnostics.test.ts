import { describe, expect, it } from "vitest";

import {
  buildHeroViewportRumPayload,
  parseComputedPixelValue,
} from "./heroViewportDiagnostics";

describe("heroViewportDiagnostics", () => {
  it("captures rendered size versus viewport size", () => {
    const payload = buildHeroViewportRumPayload({
      viewport: {
        stableHeightPx: null,
        visualViewportHeight: 720,
        innerHeight: 724,
        clientHeight: 724,
      },
      viewportHeightMode: "svh",
      viewportBrowserLabel: "ios-safari",
      sampleLabel: "mount-150ms",
      sampleIndex: 0,
      heroRect: { height: 800, bottom: 800 },
      lockupRect: { top: 620, bottom: 760 },
      navRect: { height: 64 },
      computedStyle: { height: 800, minHeight: 720, maxHeight: null },
      scrollY: 0,
    });

    expect(payload.mode).toBe("svh");
    expect(payload.browser).toBe("ios-safari");
    expect(payload.referenceViewportHeight).toBe(720);
    expect(payload.heroHeight).toBe(800);
    expect(payload.computedMinHeight).toBe(720);
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