import {
  navigateWithPushState,
  replaceWithReplaceState,
} from "@/utils/navigation";

export type CommitProjectIdOptions = {
  allowNda?: boolean;
  mode?: "push" | "replace";
  state?: Record<string, unknown> | null;
  useDoublePushFallback?: boolean;
};

export function getCommittedProjectIdFromPath(pathname: string): string {
  const segs = (pathname || "").split("/").filter(Boolean);
  if (segs.length < 2) return "";
  const root = segs[0];
  const id = segs[1] || "";
  if ((root === "project" || root === "nda-included") && id) {
    return decodeURIComponent(id);
  }
  return "";
}

export function getCommittedProjectIdFromLocation(
  fallbackProjectId = "",
): string {
  if (typeof window === "undefined") return fallbackProjectId;
  const id = getCommittedProjectIdFromPath(window.location.pathname);
  return id || fallbackProjectId;
}

export function buildCommittedProjectPath(
  projectId: string,
  allowNda = false,
): string {
  const base = allowNda ? "/nda-included/" : "/project/";
  return `${base}${encodeURIComponent(projectId)}/`;
}

export function setCommittedProjectIdInUrl(
  projectId: string,
  opts?: CommitProjectIdOptions,
): void {
  const targetHref = buildCommittedProjectPath(
    projectId,
    Boolean(opts?.allowNda),
  );
  if ((opts?.mode || "push") === "replace") {
    replaceWithReplaceState(targetHref, opts?.state || null);
    return;
  }

  navigateWithPushState(targetHref, opts?.state || null, {
    useDoublePushFallback: opts?.useDoublePushFallback,
  });
}
