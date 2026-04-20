import { detectOs, isEdge, isFirefox } from "@/utils/browser";

const STABLE_VIEWPORT_HEIGHT_REQUIRED_BROWSERS: ReadonlyArray<{
  id: string;
  matches: () => boolean;
}> = [
  {
    id: "firefox-ios",
    matches: () => detectOs() === "ios" && isFirefox(),
  },
  {
    id: "firefox-android",
    matches: () => detectOs() === "android" && isFirefox(),
  },
  {
    id: "edge-ios",
    matches: () => detectOs() === "ios" && isEdge(),
  },
  {
    id: "edge-android",
    matches: () => detectOs() === "android" && isEdge(),
  },
];

export function isManagedStableViewportHeightRequiredForCurrentBrowser() {
  if (typeof window === "undefined") return false;

  return STABLE_VIEWPORT_HEIGHT_REQUIRED_BROWSERS.some((browserRule) =>
    browserRule.matches(),
  );
}
