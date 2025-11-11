// src/hooks/useRouteChange.ts
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * useRouteChange
 * Client-only hook that invokes a callback when the route changes (pathname or search),
 * and also on external navigation like popstate/hashchange or our custom bb:routechange.
 */
export function useRouteChange(
  callback: (pathname: string, search: string) => void,
  options?: {
    mode?: "both" | "external-only" | "external-first";
    /** Delay, in ms, before firing internal fallback when using external-first */
    delayInternalMs?: number;
  },
): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = options?.mode ?? "both";
  const delayInternalMs = options?.delayInternalMs ?? 40;

  const lastSigRef = useRef<string>("");
  const externalFiredRef = useRef<string>("");

  // Next.js-driven changes (push/replace via App Router)
  useEffect(() => {
    if (mode === "external-only") return; // ignore internal changes entirely

    let liveSearch = "";
    try {
      liveSearch = window.location.search.replace(/^\?/, "");
    } catch {}
    let liveHash = "";
    try {
      liveHash = (window.location.hash || "").replace(/^#/, "");
    } catch {}

    const hookSearch = searchParams.toString();
    const effectiveSearch =
      liveSearch && liveSearch !== hookSearch ? liveSearch : hookSearch;
    const signature = `${pathname}?${effectiveSearch}#${liveHash}`;
    if (signature === lastSigRef.current) return; // suppress duplicate

    if (mode === "external-first") {
      // If an external event already handled this signature, skip internal.
      if (externalFiredRef.current === signature) return;
      // Schedule a fallback internal trigger if no external arrives.
      setTimeout(() => {
        if (externalFiredRef.current === signature) return; // external arrived
        lastSigRef.current = signature;
        callback(pathname, effectiveSearch);
      }, delayInternalMs);
      return;
    }

    lastSigRef.current = signature;
    callback(pathname, effectiveSearch);
  }, [pathname, searchParams, callback, mode, delayInternalMs]);

  // External navigation (popstate, custom, hashchange)
  useEffect(() => {
    const handler = () => {
      try {
        const { pathname, search, hash } = window.location;
        const cleanSearch = search.replace(/^\?/, "");
        const cleanHash = (hash || "").replace(/^#/, "");
        const signature = `${pathname}?${cleanSearch}#${cleanHash}`;
        if (signature === lastSigRef.current) return; // already processed
        lastSigRef.current = signature;
        externalFiredRef.current = signature;
        // Defer across a macrotask + a frame for gesture-driven URL settling.
        // Note: Transient user activation (click/keydown) improves reliability
        // of Back/Forward stepping for entries. When navigation happens
        // outside that window, this deferral helps, but invoking navigation
        // within the actual user gesture remains the most robust approach.
        setTimeout(() => {
          if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(() => callback(pathname, cleanSearch));
          } else {
            callback(pathname, cleanSearch);
          }
        }, 0);
      } catch {
        // ignore if not in browser
      }
    };
    window.addEventListener("popstate", handler);
    window.addEventListener("bb:routechange", handler as EventListener);
    window.addEventListener("hashchange", handler as EventListener);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("bb:routechange", handler as EventListener);
      window.removeEventListener("hashchange", handler as EventListener);
    };
  }, [callback]);
}
