export type DetectedOs =
  | "windows"
  | "mac"
  | "linux"
  | "ios"
  | "android"
  | "unknown";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

function getUserAgent(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent ?? "";
}

function getPlatform(): string {
  if (typeof navigator === "undefined") return "";

  const nav = navigator as NavigatorWithUserAgentData;
  return (
    nav.userAgentData?.platform ??
    navigator.platform ??
    ""
  ).toLowerCase();
}

function isTouchMacLikeDevice(): boolean {
  return typeof window !== "undefined" && "ontouchend" in window;
}

export function isFirefox(): boolean {
  const ua = getUserAgent();
  return /Firefox|FxiOS/i.test(ua);
}

export function isSafari(): boolean {
  const ua = getUserAgent();
  if (!ua) return false;

  return (
    /Safari/i.test(ua) && !/(Chrome|CriOS|FxiOS|OPiOS|EdgiOS|Brave)/i.test(ua)
  );
}

export function isIOS(): boolean {
  const uaLower = getUserAgent().toLowerCase();
  const platform = getPlatform();

  return (
    uaLower.includes("iphone") ||
    uaLower.includes("ipad") ||
    uaLower.includes("ipod") ||
    (platform.includes("mac") && isTouchMacLikeDevice())
  );
}

export function isIOSSafari(): boolean {
  return isIOS() && isSafari();
}

export function detectOs(): DetectedOs {
  const uaLower = getUserAgent().toLowerCase();
  const platform = getPlatform();

  if (platform.includes("win") || uaLower.includes("windows")) return "windows";
  if (isIOS()) return "ios";
  if (uaLower.includes("android")) return "android";
  if (platform.includes("mac") || uaLower.includes("mac os")) return "mac";
  if (platform.includes("linux") || uaLower.includes("linux")) return "linux";

  return "unknown";
}
