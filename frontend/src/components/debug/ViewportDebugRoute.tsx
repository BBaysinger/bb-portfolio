"use client";

// Browser-level viewport-unit probe for the current Safari investigation.
// This route intentionally bypasses hero logic and compares raw CSS units to live viewport APIs.
import { useEffect, useMemo, useState } from "react";

type Snapshot = {
  label: string;
  elapsed: number;
  innerWidth: number | null;
  innerHeight: number | null;
  clientWidth: number | null;
  clientHeight: number | null;
  scrollY: number | null;
  visualViewportWidth: number | null;
  visualViewportHeight: number | null;
  visualViewportOffsetTop: number | null;
  visualViewportOffsetLeft: number | null;
  visualViewportScale: number | string;
  orientation: number | string;
  vhBox: number | null;
  svhBox: number | null;
  dvhBox: number | null;
  lvhBox: number | null;
  fillBox: number | null;
};

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(180deg, #101010 0%, #050505 100%)",
  backgroundSize: "100% 80px, 80px 100%, 100% 100%",
  color: "#f4f4f4",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: "max(env(safe-area-inset-top, 0px), 12px)",
  left: "max(env(safe-area-inset-left, 0px), 12px)",
  right: "max(env(safe-area-inset-right, 0px), 12px)",
  zIndex: 20,
  padding: "12px 14px",
  border: "1px solid rgba(255, 255, 255, 0.28)",
  background: "rgba(8, 8, 8, 0.88)",
  whiteSpace: "pre-wrap",
  lineHeight: 1.35,
  fontSize: 13,
};

const measurementsStyle: React.CSSProperties = {
  position: "relative",
};

const logStyle: React.CSSProperties = {
  marginTop: 24,
  border: "1px solid rgba(255, 255, 255, 0.2)",
  background: "rgba(0, 0, 0, 0.45)",
  padding: "10px 12px",
  fontSize: 12,
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
};

const boxBaseStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  margin: 0,
  border: "2px solid currentColor",
  padding: 10,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
};

const colors = {
  vh: "#8be9fd",
  svh: "#50fa7b",
  dvh: "#ffb86c",
  lvh: "#ff79c6",
  fill: "#f1fa8c",
} as const;

function round(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : null;
}

function readBoxHeight(id: string) {
  if (typeof document === "undefined") return null;
  const element = document.getElementById(id);
  if (!element) return null;
  return round(element.getBoundingClientRect().height);
}

function readOrientationAngle() {
  if (typeof window === "undefined") return "-";

  try {
    if (
      typeof screen !== "undefined" &&
      screen.orientation &&
      typeof screen.orientation.angle === "number"
    ) {
      return screen.orientation.angle;
    }
  } catch {
    // Some history restore paths can expose fragile orientation access.
  }

  return typeof window.orientation === "number" ? window.orientation : "-";
}

export default function ViewportDebugRoute() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  useEffect(() => {
    const pageLoadedAt = performance.now();

    const takeSnapshot = (label: string) => {
      const vv = window.visualViewport;
      const nextSnapshot: Snapshot = {
        label,
        elapsed: Math.round(performance.now() - pageLoadedAt),
        innerWidth: round(window.innerWidth),
        innerHeight: round(window.innerHeight),
        clientWidth: round(document.documentElement.clientWidth),
        clientHeight: round(document.documentElement.clientHeight),
        scrollY: round(window.scrollY),
        visualViewportWidth: round(vv?.width),
        visualViewportHeight: round(vv?.height),
        visualViewportOffsetTop: round(vv?.offsetTop),
        visualViewportOffsetLeft: round(vv?.offsetLeft),
        visualViewportScale:
          vv && typeof vv.scale === "number" && Number.isFinite(vv.scale)
            ? Number(vv.scale.toFixed(3))
            : "-",
        orientation: readOrientationAngle(),
        vhBox: readBoxHeight("vhBox"),
        svhBox: readBoxHeight("svhBox"),
        dvhBox: readBoxHeight("dvhBox"),
        lvhBox: readBoxHeight("lvhBox"),
        fillBox: readBoxHeight("fillBox"),
      };

      setSnapshotError(null);
      setSnapshot(nextSnapshot);
      setLogLines((previousLines) => {
        const nextLine = [
          `${nextSnapshot.elapsed}ms`,
          nextSnapshot.label,
          `inner=${nextSnapshot.innerHeight ?? "-"}`,
          `client=${nextSnapshot.clientHeight ?? "-"}`,
          `vv=${nextSnapshot.visualViewportHeight ?? "-"}`,
          `offTop=${nextSnapshot.visualViewportOffsetTop ?? "-"}`,
          `svhBox=${nextSnapshot.svhBox ?? "-"}`,
          `dvhBox=${nextSnapshot.dvhBox ?? "-"}`,
          `lvhBox=${nextSnapshot.lvhBox ?? "-"}`,
          `fillBox=${nextSnapshot.fillBox ?? "-"}`,
          `y=${nextSnapshot.scrollY ?? "-"}`,
        ].join("  ");

        return [nextLine, ...previousLines].slice(0, 24);
      });
    };

    const safeTakeSnapshot = (label: string) => {
      try {
        takeSnapshot(label);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown snapshot failure";
        setSnapshotError(message);
        setLogLines((previousLines) => {
          const nextLine = `${Math.round(performance.now() - pageLoadedAt)}ms  ${label}  error=${message}`;
          return [nextLine, ...previousLines].slice(0, 24);
        });
      }
    };

    const scheduleSnapshot = (label: string, delayMs = 0) => {
      const run = () => {
        window.requestAnimationFrame(() => {
          safeTakeSnapshot(label);
        });
      };

      if (delayMs > 0) {
        window.setTimeout(run, delayMs);
        return;
      }

      window.requestAnimationFrame(() => {
        safeTakeSnapshot(label);
      });
    };

    const timeoutIds = [150, 1000, 2500].map((delayMs) =>
      window.setTimeout(() => {
        safeTakeSnapshot(`timeout-${delayMs}ms`);
      }, delayMs),
    );

    const onResize = () => scheduleSnapshot("window:resize");
    const onOrientationChange = () =>
      scheduleSnapshot("window:orientationchange");
    const onScroll = () => scheduleSnapshot("window:scroll");
    const onPageShow = (event: PageTransitionEvent) => {
      scheduleSnapshot(
        `window:pageshow:${event.persisted ? "persisted" : "fresh"}`,
      );
      scheduleSnapshot(
        `window:pageshow:${event.persisted ? "persisted" : "fresh"}:settled`,
        120,
      );
    };
    const onVisibilityChange = () =>
      scheduleSnapshot(`document:visibilitychange:${document.visibilityState}`);
    const onVisualViewportResize = () =>
      scheduleSnapshot("visualViewport:resize");
    const onVisualViewportScroll = () =>
      scheduleSnapshot("visualViewport:scroll");

    safeTakeSnapshot("mount:sync");
    scheduleSnapshot("mount");
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onOrientationChange, {
      passive: true,
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pageshow", onPageShow, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.visualViewport?.addEventListener("resize", onVisualViewportResize, {
      passive: true,
    });
    window.visualViewport?.addEventListener("scroll", onVisualViewportScroll, {
      passive: true,
    });

    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.visualViewport?.removeEventListener(
        "resize",
        onVisualViewportResize,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        onVisualViewportScroll,
      );
    };
  }, []);

  const overlayText = useMemo(() => {
    if (!snapshot) {
      return snapshotError
        ? `Snapshot error: ${snapshotError}`
        : "Loading metrics...";
    }

    return [
      `label:${snapshot.label} t:${snapshot.elapsed}ms`,
      `inner:${snapshot.innerWidth ?? "-"}x${snapshot.innerHeight ?? "-"}`,
      `client:${snapshot.clientWidth ?? "-"}x${snapshot.clientHeight ?? "-"}`,
      `vv:${snapshot.visualViewportWidth ?? "-"}x${snapshot.visualViewportHeight ?? "-"}`,
      `off:${snapshot.visualViewportOffsetLeft ?? "-"},${snapshot.visualViewportOffsetTop ?? "-"}`,
      `scale:${snapshot.visualViewportScale} y:${snapshot.scrollY ?? "-"}`,
      `vh:${snapshot.vhBox ?? "-"} svh:${snapshot.svhBox ?? "-"}`,
      `dvh:${snapshot.dvhBox ?? "-"} lvh:${snapshot.lvhBox ?? "-"}`,
      `fill:${snapshot.fillBox ?? "-"} orient:${snapshot.orientation}`,
      snapshotError ? `error:${snapshotError}` : null,
    ].join("\n");
  }, [snapshot, snapshotError]);

  return (
    <main style={pageStyle}>
      <div style={overlayStyle}>{overlayText}</div>
      <section style={measurementsStyle}>
        <div
          id="vhBox"
          style={{ ...boxBaseStyle, height: "100vh", color: colors.vh }}
        >
          <span>100vh</span>
        </div>
        <div
          id="svhBox"
          style={{ ...boxBaseStyle, height: "100svh", color: colors.svh }}
        >
          <span>100svh</span>
        </div>
        <div
          id="dvhBox"
          style={{ ...boxBaseStyle, height: "100dvh", color: colors.dvh }}
        >
          <span>100dvh</span>
        </div>
        <div
          id="lvhBox"
          style={{ ...boxBaseStyle, height: "100lvh", color: colors.lvh }}
        >
          <span>100lvh</span>
        </div>
        <div
          id="fillBox"
          style={{
            ...boxBaseStyle,
            minHeight: "-webkit-fill-available",
            color: colors.fill,
          }}
        >
          <span>-webkit-fill-available</span>
        </div>
        <div style={logStyle}>{logLines.join("\n")}</div>
        <div style={{ height: "120vh" }} />
      </section>
    </main>
  );
}
