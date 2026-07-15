import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useLockedStableViewportHeightVar from "./useLockedStableViewportHeightVar";

class MockVisualViewport extends EventTarget {
  height = 700;
  width = 390;
  offsetLeft = 0;
  offsetTop = 0;
  pageLeft = 0;
  pageTop = 0;
  scale = 1;
  onresize = null;
  onscroll = null;
  onscrollend = null;
}

describe("useLockedStableViewportHeightVar", () => {
  let visualViewport: MockVisualViewport;
  let viewportWidth = 390;
  let cssSmallHeight = 0;
  let cssLargeHeight = 0;

  const setScrollY = (value: number) => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value,
    });
  };

  const setUserAgent = (value: string) => {
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value,
    });
  };

  const renderViewportHeightHook = (element: HTMLElement) =>
    renderHook(() => {
      const elementRef = useRef<HTMLElement | null>(element);
      return useLockedStableViewportHeightVar(elementRef);
    });

  beforeEach(() => {
    viewportWidth += 100;
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    document.documentElement.style.removeProperty("--stable-vh");
    document.documentElement.style.removeProperty("--short-vh");
    document.documentElement.style.removeProperty("--long-vh");
    visualViewport = new MockVisualViewport();
    cssSmallHeight = 0;
    cssLargeHeight = 0;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: viewportWidth,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: visualViewport,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: query === "(pointer: coarse)",
      })),
    });
    vi.stubGlobal("CSS", { supports: vi.fn(() => true) });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const height =
          this.style.height === "100svh"
            ? cssSmallHeight
            : this.style.height === "100lvh"
              ? cssLargeHeight
              : 0;

        return {
          x: 0,
          y: 0,
          width: 0,
          height,
          top: 0,
          right: 0,
          bottom: height,
          left: 0,
          toJSON: () => ({}),
        };
      },
    );
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reuses the captured short height when rerouting while scrolled", () => {
    setScrollY(0);
    visualViewport.height = 600;
    const initialElement = document.createElement("div");

    const initialRender = renderViewportHeightHook(initialElement);

    expect(initialRender.result.current).toBe(600);
    expect(initialElement.style.getPropertyValue("--short-vh")).toBe("600px");
    expect(initialElement.style.getPropertyValue("--long-vh")).toBe("600px");
    initialRender.unmount();

    setScrollY(100);
    visualViewport.height = 700;
    const reroutedElement = document.createElement("div");

    const { result } = renderViewportHeightHook(reroutedElement);

    expect(result.current).toBe(600);
    expect(reroutedElement.style.getPropertyValue("--stable-vh")).toBe("600px");
    expect(reroutedElement.style.getPropertyValue("--short-vh")).toBe("600px");
    expect(reroutedElement.style.getPropertyValue("--long-vh")).toBe("700px");

    setScrollY(0);
    visualViewport.height = 580;
    act(() => visualViewport.dispatchEvent(new Event("resize")));

    expect(result.current).toBe(600);
    expect(reroutedElement.style.getPropertyValue("--stable-vh")).toBe("600px");
  });

  it("publishes short and long heights globally without an element ref", () => {
    setScrollY(0);
    visualViewport.height = 600;

    renderHook(() => useLockedStableViewportHeightVar());

    expect(document.documentElement.style.getPropertyValue("--short-vh")).toBe(
      "600px",
    );
    expect(document.documentElement.style.getPropertyValue("--long-vh")).toBe(
      "600px",
    );

    setScrollY(100);
    visualViewport.height = 700;
    act(() => visualViewport.dispatchEvent(new Event("resize")));

    expect(document.documentElement.style.getPropertyValue("--short-vh")).toBe(
      "600px",
    );
    expect(document.documentElement.style.getPropertyValue("--long-vh")).toBe(
      "700px",
    );
  });

  it("uses native small viewport height on a fresh Chrome iOS visit", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
    );
    setScrollY(0);
    cssSmallHeight = 600;
    cssLargeHeight = 700;
    visualViewport.height = 820;

    const { result } = renderHook(() =>
      useLockedStableViewportHeightVar(null, { navigationKey: "/" }),
    );

    expect(result.current).toBe(600);
    expect(document.documentElement.style.getPropertyValue("--short-vh")).toBe(
      "600px",
    );
    expect(document.documentElement.style.getPropertyValue("--stable-vh")).toBe(
      "600px",
    );
  });

  it("uses Chrome's visible long height after routing until the user scrolls", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
    );
    setScrollY(0);
    visualViewport.height = 600;

    const { result, rerender } = renderHook(
      ({ navigationKey }) =>
        useLockedStableViewportHeightVar(null, { navigationKey }),
      { initialProps: { navigationKey: "/project/example" } },
    );

    expect(result.current).toBe(600);

    setScrollY(100);
    visualViewport.height = 700;
    rerender({ navigationKey: "/" });

    // The returned value remains the cached layout baseline; CSS reflects Chrome's
    // temporary route-visible height without forcing a second React render.
    expect(result.current).toBe(600);
    expect(document.documentElement.style.getPropertyValue("--short-vh")).toBe(
      "600px",
    );
    expect(document.documentElement.style.getPropertyValue("--long-vh")).toBe(
      "700px",
    );
    expect(document.documentElement.style.getPropertyValue("--stable-vh")).toBe(
      "700px",
    );

    act(() => window.dispatchEvent(new Event("scroll")));

    expect(result.current).toBe(600);
    expect(document.documentElement.style.getPropertyValue("--stable-vh")).toBe(
      "600px",
    );
  });

  it("keeps a top-anchored mobile height locked during ordinary scrolling", () => {
    setScrollY(0);
    visualViewport.height = 600;
    const element = document.createElement("div");

    const { result } = renderViewportHeightHook(element);

    setScrollY(100);
    visualViewport.height = 700;
    act(() => visualViewport.dispatchEvent(new Event("resize")));

    expect(result.current).toBe(600);
    expect(element.style.getPropertyValue("--stable-vh")).toBe("600px");
  });

  it("recaptures the short height after an orientation change", () => {
    setScrollY(0);
    visualViewport.height = 600;
    const element = document.createElement("div");

    const { result } = renderViewportHeightHook(element);

    visualViewport.height = 400;
    act(() => window.dispatchEvent(new Event("orientationchange")));

    expect(result.current).toBe(400);
    expect(element.style.getPropertyValue("--stable-vh")).toBe("400px");
  });
});
