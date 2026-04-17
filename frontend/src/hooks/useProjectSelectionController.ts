"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  DirectionType,
  Source,
  SourceType,
} from "@/components/project-carousel-page/carousel-core/CarouselTypes";
import { useRouteChange } from "@/hooks/useRouteChange";
import {
  getCommittedProjectIdFromPath,
  setCommittedProjectIdInUrl,
} from "@/utils/projectRoute";

type UseProjectSelectionControllerParams = {
  projectId: string;
  allowNda?: boolean;
  slideKeys: string[];
  stabilizedIndex: number | null;
  setStabilizedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setUiDirection: React.Dispatch<React.SetStateAction<DirectionType>>;
};

type UseProjectSelectionControllerResult = {
  handleReady: (index: number) => void;
  handleStabilizationUpdate: (
    newStabilizedIndex: number,
    source: SourceType,
    direction: DirectionType,
  ) => void;
  isCarouselSourceRef: React.MutableRefObject<boolean>;
  didFirstStabilizeRef: React.MutableRefObject<boolean>;
  lastCarouselPushTsRef: React.MutableRefObject<number | null>;
};

export function useProjectSelectionController(
  params: UseProjectSelectionControllerParams,
): UseProjectSelectionControllerResult {
  const {
    projectId,
    allowNda,
    slideKeys,
    stabilizedIndex,
    setStabilizedIndex,
    setUiDirection,
  } = params;

  const stabilizationTimer = useRef<NodeJS.Timeout | null>(null);
  const lastKnownProjectIdRef = useRef(projectId);
  const isCarouselSourceRef = useRef(false);
  const didFirstStabilizeRef = useRef(false);
  const lastCarouselPushTsRef = useRef<number | null>(null);

  const handleReady = useCallback((_: number) => {
    didFirstStabilizeRef.current = true;
  }, []);

  useRouteChange(
    (pathname) => {
      const next = getCommittedProjectIdFromPath(pathname || "");
      if (next && next !== lastKnownProjectIdRef.current) {
        lastKnownProjectIdRef.current = next;
      }
    },
    { mode: "external-only" },
  );

  const handleStabilizationUpdate = useCallback(
    (
      newStabilizedIndex: number,
      source: SourceType,
      direction: DirectionType,
    ) => {
      // Allow route-driven scrolls only after first stabilization settles.
      didFirstStabilizeRef.current = true;

      if (stabilizedIndex === newStabilizedIndex) return;

      isCarouselSourceRef.current = true;
      const newProjectId =
        newStabilizedIndex >= 0 && newStabilizedIndex < slideKeys.length
          ? slideKeys[newStabilizedIndex]
          : undefined;

      if (
        newProjectId &&
        newProjectId !== lastKnownProjectIdRef.current &&
        source === Source.SCROLL
      ) {
        try {
          const state = {
            ...(window.history.state || {}),
            source: "carousel",
            projectId: newProjectId,
            ts: Date.now(),
          };
          lastCarouselPushTsRef.current = state.ts as number;

          setCommittedProjectIdInUrl(newProjectId, {
            allowNda: Boolean(allowNda),
            mode: "push",
            state,
            useDoublePushFallback: process.env.NEXT_PUBLIC_DOUBLE_PUSH === "1",
          });
        } catch {
          setCommittedProjectIdInUrl(newProjectId, {
            allowNda: Boolean(allowNda),
            mode: "push",
            state: { source: "carousel" },
            useDoublePushFallback: process.env.NEXT_PUBLIC_DOUBLE_PUSH === "1",
          });
          lastCarouselPushTsRef.current =
            typeof Date.now === "function" ? Date.now() : null;
        }

        lastKnownProjectIdRef.current = newProjectId;
      }

      if (stabilizationTimer.current) {
        clearTimeout(stabilizationTimer.current);
      }

      setUiDirection(direction);
      setStabilizedIndex(newStabilizedIndex);
    },
    [allowNda, setStabilizedIndex, setUiDirection, slideKeys, stabilizedIndex],
  );

  useEffect(() => {
    lastKnownProjectIdRef.current = projectId;
  }, [projectId]);

  return {
    handleReady,
    handleStabilizationUpdate,
    isCarouselSourceRef,
    didFirstStabilizeRef,
    lastCarouselPushTsRef,
  };
}
