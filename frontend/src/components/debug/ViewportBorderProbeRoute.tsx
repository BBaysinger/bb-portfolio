"use client";

// Minimal policy probe for the current Safari viewport bug.
// Cyan = fixed viewport frame. Green = element height chosen by our hook strategy.
import { Suspense, useMemo, useRef } from "react";

import useQueryParams from "@/hooks/useQueryParams";
import useLockedStableViewportHeightVar from "@/hooks/viewport/useLockedStableViewportHeightVar";
import useStableViewportHeightVar from "@/hooks/viewport/useStableViewportHeightVar";

import DebugOverlay from "../common/DebugOverlay";
import {
  readViewportDebugQueryParam,
  readViewportHeightStrategyQueryParam,
} from "../home-page/header-main/heroViewportQueryParams";

function ViewportBorderProbeClient() {
  const queryParams = useQueryParams();
  const frameRef = useRef<HTMLElement>(null);

  const viewportDebug = readViewportDebugQueryParam(queryParams);
  const viewportHeightStrategy =
    readViewportHeightStrategyQueryParam(queryParams) ?? "default";

  const lockedHeightPx = useLockedStableViewportHeightVar(frameRef, {
    cssVarName:
      viewportHeightStrategy === "locked"
        ? "--border-probe-stable-vh"
        : "--border-probe-stable-vh-probe",
    enabled: viewportHeightStrategy === "locked",
  });

  const defaultStableHeightPx = useStableViewportHeightVar(frameRef, {
    cssVarName:
      viewportHeightStrategy === "locked"
        ? "--border-probe-stable-vh-default"
        : "--border-probe-stable-vh",
    mode:
      viewportHeightStrategy === "locked"
        ? "use-svh-for-all"
        : "use-where-required",
    heightOnlyResizePolicy: "pointer-fine-or-shrink",
  });

  const activeStableHeightPx =
    viewportHeightStrategy === "locked"
      ? lockedHeightPx
      : defaultStableHeightPx;

  const summary = useMemo(() => {
    if (!viewportDebug || typeof window === "undefined") return null;

    const vv = window.visualViewport;

    return [
      `strategy:${viewportHeightStrategy}`,
      `mode:${activeStableHeightPx === null ? "svh" : "managed"}`,
      `stable:${activeStableHeightPx ?? "-"}`,
      `vv:${vv ? Math.round(vv.height) : "-"}`,
      `off:${vv ? Math.round(vv.offsetTop) : "-"}`,
      `inner:${Math.round(window.innerHeight)}`,
      `client:${Math.round(document.documentElement.clientHeight)}`,
      `y:${Math.round(window.scrollY)}`,
    ].join(" ");
  }, [activeStableHeightPx, viewportDebug, viewportHeightStrategy]);

  return (
    <>
      <DebugOverlay visible={viewportDebug} summary={summary} />
      <main
        ref={frameRef}
        style={{
          position: "relative",
          minHeight: "var(--border-probe-stable-vh, 100svh)",
          background: "#050505",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            border: "2px solid rgba(80, 250, 123, 0.95)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            border: "2px solid rgba(139, 233, 253, 0.95)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      </main>
    </>
  );
}

export default function ViewportBorderProbeRoute() {
  return (
    <Suspense fallback={null}>
      <ViewportBorderProbeClient />
    </Suspense>
  );
}
