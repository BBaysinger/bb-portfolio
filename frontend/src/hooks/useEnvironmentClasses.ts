import { useEffect } from "react";

/**
 * Adds environment/OS classes to the document root element for OS-specific styling.
 *
 * Primary output (by default):
 * - `html.windows`, `html.mac`, `html.ios`, `html.android`, `html.linux`
 * - `html.apple` for macOS + iOS
 */

type DetectedOs = "windows" | "mac" | "linux" | "ios" | "android" | "unknown";

function isFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  // Desktop: "Firefox"; iOS Firefox: "FxiOS".
  return /Firefox|FxiOS/i.test(ua);
}

function detectOs(): DetectedOs {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent ?? "";

  // Prefer UA-CH platform when available (Chromium-based browsers)
  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const uaChPlatform = nav.userAgentData?.platform ?? "";

  const platform = (uaChPlatform || navigator.platform || "").toLowerCase();
  const uaLower = ua.toLowerCase();

  if (platform.includes("win") || uaLower.includes("windows")) return "windows";
  if (platform.includes("mac") || uaLower.includes("mac os")) return "mac";

  // iOS can report as "Mac" with touch; use UA hints.
  if (
    uaLower.includes("iphone") ||
    uaLower.includes("ipad") ||
    uaLower.includes("ipod")
  )
    return "ios";

  if (uaLower.includes("android")) return "android";

  if (platform.includes("linux") || uaLower.includes("linux")) return "linux";

  return "unknown";
}

export type EnvironmentClassHookOptions = {
  /**
   * Defaults to `document.documentElement`.
   * If you ever need the class on `body` instead, you can pass it in.
   */
  element?: HTMLElement | null;

  /**
   * Which OS classes to manage. Defaults to the common OS set.
   */
  osClasses?: Partial<Record<DetectedOs, boolean>>;

  /** Prefix for OS classes (e.g. `os-windows`). Defaults to none. */
  osClassPrefix?: string;

  /**
   * Adds a `.apple` class when OS is macOS or iOS.
   * Defaults to true.
   */
  addAppleClass?: boolean;

  /** Adds a `html.firefox` class when the browser is Firefox (including iOS Firefox). Defaults to true. */
  addFirefoxClass?: boolean;
};

/**
 * Adds environment classes (starting with `.windows`) for platform-specific styling.
 */
export function useEnvironmentClasses(
  options: EnvironmentClassHookOptions = {},
) {
  useEffect(() => {
    const element = options.element ?? document.documentElement;
    if (!element) return;

    const os = detectOs();

    const osClasses =
      options.osClasses ??
      ({
        windows: true,
        mac: true,
        ios: true,
        android: true,
        linux: true,
      } satisfies Partial<Record<DetectedOs, boolean>>);
    const osClassPrefix = options.osClassPrefix ?? "";
    const addAppleClass = options.addAppleClass ?? true;
    const addFirefoxClass = options.addFirefoxClass ?? true;

    const enabledOs = (Object.keys(osClasses) as DetectedOs[]).filter(
      (k) => osClasses[k],
    );

    const classesToRemove = enabledOs.map((k) => `${osClassPrefix}${k}`);
    if (addAppleClass) classesToRemove.push("apple");
    if (addFirefoxClass) classesToRemove.push("firefox");
    for (const cls of classesToRemove) element.classList.remove(cls);

    if (os !== "unknown" && osClasses[os]) {
      element.classList.add(`${osClassPrefix}${os}`);
    }

    if (addAppleClass && (os === "mac" || os === "ios")) {
      element.classList.add("apple");
    }

    if (addFirefoxClass && isFirefox()) {
      element.classList.add("firefox");
    }

    return () => {
      for (const cls of classesToRemove) element.classList.remove(cls);
    };
  }, [
    options.addAppleClass,
    options.addFirefoxClass,
    options.element,
    options.osClassPrefix,
    options.osClasses,
  ]);
}
