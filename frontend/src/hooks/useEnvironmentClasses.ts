import { useEffect } from "react";

import { detectOs, isFirefox } from "../utils/browser";

/**
 * Adds environment/OS classes to the document root element for OS-specific styling.
 *
 * Primary output (by default):
 * - `html.windows`, `html.mac`, `html.ios`, `html.android`, `html.linux`
 * - `html.apple` for macOS + iOS
 */

import type { DetectedOs } from "../utils/browser";

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
