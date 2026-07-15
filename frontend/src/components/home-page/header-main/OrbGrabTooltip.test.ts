import { describe, expect, it } from "vitest";

import { shouldShowOrbGrabTooltip } from "./orbGrabTooltipEligibility";

describe("shouldShowOrbGrabTooltip", () => {
  it("stays disabled while persisted eligibility is unknown", () => {
    expect(
      shouldShowOrbGrabTooltip({
        isKnown: false,
        hasDragged: false,
        hasCollided: false,
      }),
    ).toBe(false);
  });

  it("shows only for a known first-time interaction state", () => {
    expect(
      shouldShowOrbGrabTooltip({
        isKnown: true,
        hasDragged: false,
        hasCollided: false,
      }),
    ).toBe(true);
  });

  it.each([
    { hasDragged: true, hasCollided: false },
    { hasDragged: false, hasCollided: true },
    { hasDragged: true, hasCollided: true },
  ])("stays disabled after prior interaction: %o", (interactionState) => {
    expect(
      shouldShowOrbGrabTooltip({
        isKnown: true,
        ...interactionState,
      }),
    ).toBe(false);
  });
});
