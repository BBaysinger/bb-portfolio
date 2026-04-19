const SAFE_PROJECT_KEY_PATTERN = /^[a-z0-9-]+$/i;

const normalizeRouteKey = (value: string | null | undefined): string => {
  const normalized = (value || "").trim().replace(/\/+$/u, "");
  return SAFE_PROJECT_KEY_PATTERN.test(normalized) ? normalized : "";
};

export const getPublicRedirectForNdaUrl = (
  pathname: string,
  searchParams?: URLSearchParams | string,
): string => {
  try {
    const match = /^\/nda-included\/([^/]+)(?:\/|$)/.exec(pathname || "");
    const projectId = normalizeRouteKey(match?.[1]);
    if (projectId) {
      return `/project/${encodeURIComponent(projectId)}/`;
    }

    const params =
      typeof searchParams === "string"
        ? new URLSearchParams(searchParams)
        : searchParams;
    const queryProjectId = normalizeRouteKey(params?.get("p"));

    return queryProjectId
      ? `/project/${encodeURIComponent(queryProjectId)}/`
      : "/projects/";
  } catch {
    return "/projects/";
  }
};

export const isNdaRoutePath = (pathname: string): boolean => {
  return /^\/nda-included(?:\/|$)/.test(pathname || "");
};
