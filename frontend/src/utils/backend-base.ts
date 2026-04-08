const DEFAULT_BACKEND_BASE = "http://localhost:8081";

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

export const normalizeBackendProfile = (rawProfile: string) => {
  const normalized = rawProfile.toLowerCase().trim();
  if (normalized.startsWith("prod")) return "prod";
  if (normalized === "development" || normalized.startsWith("dev")) {
    return "dev";
  }
  if (normalized.startsWith("local")) return "local";
  return normalized;
};

export const getBackendServiceBase = (profile: string) => {
  if (profile === "prod") return "http://bb-portfolio-backend-prod:3000";
  if (profile === "dev") return "http://bb-portfolio-backend-dev:3000";
  if (profile === "local") return "http://bb-portfolio-backend-local:3001";
  return "";
};

const matchesRequestHost = (baseUrl: string, requestHost?: string) => {
  if (!requestHost) return false;
  try {
    return new URL(baseUrl).host === requestHost;
  } catch {
    return false;
  }
};

type ResolveBackendBaseOptions = {
  rawProfile?: string;
  preferredBase?: string;
  requestHost?: string;
  avoidRequestHost?: boolean;
  fallbackBase?: string;
};

export const resolveBackendBase = (options: ResolveBackendBaseOptions = {}) => {
  const rawProfile =
    options.rawProfile ??
    (process.env.ENV_PROFILE || process.env.NODE_ENV || "").toLowerCase();
  const profile = normalizeBackendProfile(rawProfile);
  const preferred = (
    options.preferredBase ??
    process.env.BACKEND_INTERNAL_URL ??
    ""
  ).trim();
  const serviceBase = getBackendServiceBase(profile);
  const fallbackBase = trimTrailingSlash(
    options.fallbackBase?.trim() || DEFAULT_BACKEND_BASE,
  );

  if (preferred && isHttpUrl(preferred)) {
    const normalizedPreferred = trimTrailingSlash(preferred);
    if (
      options.avoidRequestHost &&
      matchesRequestHost(normalizedPreferred, options.requestHost)
    ) {
      return serviceBase || fallbackBase;
    }
    return normalizedPreferred;
  }

  return serviceBase || fallbackBase;
};
