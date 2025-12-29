"use client";

import { useSyncExternalStore } from "react";

import ProjectData from "@/data/ProjectData";

/**
 * Subscribes to ProjectData singleton changes.
 * Use this in components that read from ProjectData without receiving the data via props.
 */
export function useProjectDataVersion(): number {
  return useSyncExternalStore(
    (onStoreChange) => ProjectData.subscribe(onStoreChange),
    () => ProjectData.version,
    () => 0,
  );
}
