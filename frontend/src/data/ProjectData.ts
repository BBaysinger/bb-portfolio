const COOKIE_HEADER_NAME = "cookie";

const getCookieHeaderValue = (headers?: HeadersInit): string => {
  if (!headers) return "";
  if (Array.isArray(headers)) {
    const entry = headers.find(
      ([key]) => key.toLowerCase() === COOKIE_HEADER_NAME,
    );
    return entry ? entry[1] : "";
  }
  if (headers instanceof Headers) {
    return headers.get(COOKIE_HEADER_NAME) || "";
  }
  const obj = headers as Record<string, string>;
  const matchKey = Object.keys(obj).find(
    (key) => key.toLowerCase() === COOKIE_HEADER_NAME,
  );
  return matchKey ? obj[matchKey] : "";
};

const extractPayloadTokenFromCookie = (cookieHeader: string): string => {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const [name, ...rest] = part.split("=");
    if (name && name.trim() === "payload-token") {
      return rest.join("=");
    }
  }
  return "";
};

const headersContainPayloadSession = (headers?: HeadersInit): boolean => {
  return !!extractPayloadTokenFromCookie(getCookieHeaderValue(headers));
};

// Fetch project data from the live API only (no JSON fallback)
// Transforms Payload REST shape { docs: [...] } into a keyed record by slug.
interface FetchProjectsMetadata {
  containsSanitizedPlaceholders: boolean;
  hasNdaAccess?: boolean;
}

interface FetchProjectsResult {
  data: PortfolioProjectData;
  metadata: FetchProjectsMetadata;
}

async function fetchPortfolioProjects(opts?: {
  /** Optional request headers to forward (e.g., Cookie for auth-aware results). */
  requestHeaders?: HeadersInit;
  /** Disable cache for per-request SSR. */
  disableCache?: boolean;
}): Promise<FetchProjectsResult> {
  const { requestHeaders, disableCache } = opts || {};
  const cookieHeaderRaw = getCookieHeaderValue(requestHeaders);
  const payloadToken = extractPayloadTokenFromCookie(cookieHeaderRaw);
  const isServer = typeof window === "undefined";
  const rawProfile = (
    process.env.ENV_PROFILE ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();
  const normalizedProfile = rawProfile.startsWith("prod")
    ? "prod"
    : rawProfile === "development" || rawProfile.startsWith("dev")
      ? "dev"
      : rawProfile.startsWith("local")
        ? "local"
        : rawProfile;
  let base = process.env.BACKEND_INTERNAL_URL || "";

  // Conventional: rely on Next.js rewrites for /api/* on the server.
  // Fail fast if .env is incomplete so misconfigurations are obvious.
  const isHttpUrl = (s: string) => /^https?:\/\//i.test(s);
  // Determine a service-DNS fallback usable inside the compose network
  const serviceDnsFallback =
    normalizedProfile === "dev"
      ? "http://bb-portfolio-backend-dev:3000"
      : normalizedProfile === "prod"
        ? "http://bb-portfolio-backend-prod:3000"
        : normalizedProfile === "local"
          ? "http://bb-portfolio-backend-local:3001"
          : "";

  if (isServer && !isHttpUrl(base)) {
    // Safety net: if envs are stale or misnamed, prefer service DNS rather than throwing
    if (serviceDnsFallback) base = serviceDnsFallback;
  }

  // Build URL
  // - Client: always use relative path so Next.js rewrites proxy to backend and forwards cookies
  // - Server: if request cookies exist, prefer same-origin relative URL so auth is preserved;
  //           otherwise fall back to absolute backend URL (with a service-DNS fallback in dev/local)
  // We need depth=2 so that nested relations on brand (logoLight/logoDark uploads) are populated
  // alongside the project -> brand -> upload chain.
  // Note: Using trailing slash for client-side to match Next.js trailingSlash: true config
  // Backend admin is now mounted via explicit /admin route segments, so the public API stays at /api.
  // Still allow BACKEND_BASE_PATH overrides for legacy hosts that mount the backend under a subdirectory.
  const backendBasePath = (process.env.BACKEND_BASE_PATH || "").replace(
    /\/$/,
    "",
  );
  const apiPrefix = backendBasePath ? `${backendBasePath}/api` : "/api";
  const path = `${apiPrefix}/projects/?depth=2&limit=1000&sort=sortIndex`;
  const serverPath = `${apiPrefix}/projects/?depth=2&limit=1000&sort=sortIndex`;
  // If we're on the server AND we have request cookies (SSR with potential auth),
  // prefer using a relative URL so the Next.js proxy/rewrites can forward cookies
  // to the backend correctly. Direct absolute calls to the backend may not see
  // the session cookie due to domain scoping.
  const hasRequestCookies =
    !!requestHeaders &&
    (() => {
      if (Array.isArray(requestHeaders))
        return requestHeaders.some(([k]) => k.toLowerCase() === "cookie");
      if (requestHeaders instanceof Headers)
        return !!requestHeaders.get("cookie");
      const obj = requestHeaders as Record<string, string>;
      return Object.keys(obj).some((k) => k.toLowerCase() === "cookie");
    })();

  // Attempt to infer the public origin of the current request for server-side relative fetches
  const _inferRequestOrigin = (): string => {
    if (!requestHeaders) return "";
    const get = (name: string): string | undefined => {
      if (Array.isArray(requestHeaders)) {
        const entry = requestHeaders.find(
          ([k]) => k.toLowerCase() === name.toLowerCase(),
        );
        return entry ? entry[1] : undefined;
      }
      if (requestHeaders instanceof Headers)
        return requestHeaders.get(name) || undefined;
      const obj = requestHeaders as Record<string, string>;
      // Headers in Next can be normalized to lowercase keys
      const lower = Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
      ) as Record<string, string>;
      return lower[name.toLowerCase()];
    };

    const host = get("x-forwarded-host") || get("host");
    if (!host) return "";
    const proto =
      get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  };

  // IMPORTANT: For server-side data fetching, always call the backend directly using
  // the internal/base URL. Forward the Cookie header explicitly so Payload can
  // authenticate the request and include NDA content when permitted.
  // Rationale: Relative fetches (e.g. "/api/projects") from within the Next.js
  // server may not traverse the edge/ingress proxy where /api is routed to the
  // backend, leading to 404s or public responses. Using the backend URL here is
  // reliable in all environments (local/dev/prod) and still honors auth because
  // we forward the Cookie header below.
  const primaryUrl = isServer
    ? `${base.replace(/\/$/, "")}${serverPath}`
    : path;
  const fallbackUrl =
    isServer && serviceDnsFallback
      ? `${serviceDnsFallback.replace(/\/$/, "")}${serverPath}`
      : undefined;

  const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {};
  // Avoid leaking authenticated NDA content via Next.js fetch cache on the server.
  // Rule: On the server, always use no-store. On the client, allow a short revalidate window
  // unless explicitly disabled by caller.
  if (typeof window === "undefined") {
    fetchOptions.cache = "no-store";
  } else if (disableCache) {
    fetchOptions.cache = "no-store";
  } else {
    fetchOptions.next = { revalidate: 3600 };
  }
  if (requestHeaders) {
    // Clone headers and also add Authorization: JWT <token> if a payload-token cookie is present.
    const cloneHeaders: Record<string, string> = (() => {
      if (Array.isArray(requestHeaders)) {
        return Object.fromEntries(
          requestHeaders.map(([k, v]) => [k, v] as [string, string]),
        );
      }
      if (requestHeaders instanceof Headers) {
        const obj: Record<string, string> = {};
        requestHeaders.forEach((v, k) => {
          obj[k] = v;
        });
        return obj;
      }
      return { ...(requestHeaders as Record<string, string>) };
    })();

    if (payloadToken) {
      cloneHeaders["Authorization"] = `JWT ${payloadToken}`;
    }
    fetchOptions.headers = cloneHeaders;
    fetchOptions.credentials = "include";
  } else if (!isServer) {
    // Ensure browser requests include auth cookies for NDA-aware responses
    fetchOptions.credentials = "include";
  }

  // Timeout policy: give dev/local a bit more time, prod moderate.
  // Timeout policy: initial cold starts for Payload + Next.js in dev/local can exceed 8s
  // due to on-demand route compilation and deep population (depth=2). Increase to 20s
  // for dev/local to avoid premature aborts causing SSR fallback failures.
  const baseTimeoutMs =
    normalizedProfile === "dev" || normalizedProfile === "local" ? 20000 : 5000;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  // Helper to add a timeout so we can fail fast and try a retry/fallback
  const withTimeout = async (url: string, ms: number = baseTimeoutMs) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { ...fetchOptions, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  // Debug logging is enabled when DEBUG_PROJECT_DATA=1 and not in prod profile.
  // Using normalizedProfile avoids accidental logging in production even if the env var is left set.
  const debug =
    process.env.DEBUG_PROJECT_DATA === "1" && normalizedProfile !== "prod";
  if (debug) {
    try {
      console.info("[ProjectData] profile/base/cookies", {
        normalizedProfile,
        base,
        hasRequestCookies,
        primaryUrlPreview: isServer
          ? hasRequestCookies
            ? "<same-origin>/api/projects"
            : `${base.replace(/\/$/, "")}${serverPath}`
          : path,
        fallbackUrl,
      });
    } catch {}
  }

  let res: Response;
  try {
    res = await withTimeout(primaryUrl, baseTimeoutMs);
    // If upstream is clearly failing (>=500) and we have a service DNS alternative, try it
    if (
      !res.ok &&
      res.status >= 500 &&
      fallbackUrl &&
      fallbackUrl !== primaryUrl
    ) {
      try {
        const alt = await withTimeout(fallbackUrl, baseTimeoutMs);
        if (alt.ok) {
          res = alt;
          if (debug)
            console.info("[ProjectData] primary failed, using fallback", {
              primaryStatus: `${res.status} ${res.statusText}`,
              fallbackUrl,
            });
        }
      } catch {
        // ignore, will error on primary result below
      }
    }
  } catch (e) {
    // Network failure on primary; try one retry path.
    const err = e as Error & { name?: string };
    // Prefer fallback URL if it's different; otherwise retry primary once after a brief backoff with longer timeout.
    const retryUrl =
      fallbackUrl && fallbackUrl !== primaryUrl ? fallbackUrl : primaryUrl;
    try {
      if (process.env.NODE_ENV !== "production") {
        // small jitter to allow backend warm-up
        await delay(600);
      }
      res = await withTimeout(retryUrl, Math.floor(baseTimeoutMs * 1.5));
    } catch (e2) {
      // Provide a clearer message including both attempts
      const suffix =
        retryUrl === primaryUrl
          ? "(retried primary)"
          : `(fallback ${retryUrl})`;
      const msg = `Failed to fetch project data: ${primaryUrl} (${err?.message}) ${suffix} also failed (${(e2 as Error).message})`;
      if (debug) console.error("[ProjectData] fetch error", msg);
      throw new Error(msg);
    }
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    if (debug)
      console.error("[ProjectData] non-ok response", {
        status: `${res.status} ${res.statusText}`,
        sample: detail?.slice(0, 200),
      });
    throw new Error(
      `Failed to fetch project data: ${res.status} ${res.statusText}${
        detail ? ` - ${detail.slice(0, 300)}` : ""
      }`,
    );
  }
  type BrandObj = {
    slug?: string;
    id?: string;
    nda?: boolean;
    logoLight?: unknown;
    logoDark?: unknown;
  };
  type BrandRel = string | BrandObj | Array<BrandObj>;
  const brandRelationIsNda = (rel: BrandRel | undefined): boolean => {
    if (!rel) return false;
    if (Array.isArray(rel)) {
      return rel.some((entry) => Boolean(entry && (entry as BrandObj).nda));
    }
    if (typeof rel === "object") {
      return Boolean((rel as BrandObj).nda);
    }
    return false;
  };
  interface PayloadProjectDoc {
    slug?: string;
    id?: string;
    uuid?: string;
    title?: string;
    sortIndex?: number;
    active?: boolean;
    omitFromList?: boolean;
    nda?: boolean;
    brandId?: BrandRel;
    tags?: Array<{ tag?: string }>;
    role?: Array<{ value?: string }> | string;
    year?: string;
    awards?: Array<{ award?: string }> | string;
    type?: string;
    desc?: Array<{ block?: string }>;
    date?: string;
    urls?: Array<{ label?: string; url?: string }>;
    // Relationships (populated via depth=1)
    thumbnail?: unknown; // could be string | object | array of objects (upload docs)
    lockedThumbnail?: unknown;
    screenshots?: unknown; // relationship to projectScreenshots (array)
  }
  interface PayloadProjectsRest {
    docs: PayloadProjectDoc[];
  }
  // Type guard to detect Payload REST shape
  const isPayloadRest = (val: unknown): val is PayloadProjectsRest => {
    return (
      typeof val === "object" &&
      val !== null &&
      Array.isArray((val as Record<string, unknown>).docs)
    );
  };

  const json = (await res.json()) as PayloadProjectsRest | PortfolioProjectData;
  const docs: PayloadProjectDoc[] = isPayloadRest(json) ? json.docs : [];
  const ndaDocsCount = docs.reduce(
    (total, doc) =>
      doc?.nda || brandRelationIsNda(doc?.brandId) ? total + 1 : total,
    0,
  );
  const backendProvidedNdaDetails = docs.some((doc) => {
    if (!doc?.nda && !brandRelationIsNda(doc?.brandId)) return false;
    // Payload scrubbing forces a generic title/empty fields; any richer data implies authenticated access.
    const sanitizedTitle =
      !doc.title || doc.title.trim().toLowerCase() === "confidential project";
    const hasRichFields = Boolean(
      (doc.desc && doc.desc.length > 0) ||
      (doc.urls && doc.urls.length > 0) ||
      doc.thumbnail ||
      doc.screenshots,
    );
    return !sanitizedTitle || hasRichFields;
  });
  const sessionCookiePresent =
    typeof window !== "undefined"
      ? true
      : headersContainPayloadSession(requestHeaders);
  const hasNdaAccess =
    backendProvidedNdaDetails || (ndaDocsCount === 0 && sessionCookiePresent);

  if (debug) {
    try {
      const cookieVal = (() => {
        if (!requestHeaders) return "<none>";
        if (Array.isArray(requestHeaders)) {
          const entry = requestHeaders.find(
            ([k]) => k.toLowerCase() === "cookie",
          );
          return entry ? entry[1] : "<none-array>";
        }
        if (requestHeaders instanceof Headers)
          return requestHeaders.get("cookie") || "<none-headers>";
        const obj = requestHeaders as Record<string, string>;
        const foundKey = Object.keys(obj).find(
          (k) => k.toLowerCase() === "cookie",
        );
        return foundKey ? obj[foundKey] : "<none-object>";
      })();
      console.info("[ProjectData] post-fetch auth context", {
        responseStatus: res.status,
        ndaDocsCount,
        backendProvidedNdaDetails,
        hasNdaAccess,
        cookieHeaderSnippet: cookieVal?.slice(0, 200),
      });
    } catch {}
  }

  if (!isPayloadRest(json)) {
    // Already in expected record form
    return {
      data: json as PortfolioProjectData,
      metadata: {
        containsSanitizedPlaceholders: false,
        hasNdaAccess,
      },
    };
  }

  const out: PortfolioProjectData = {};
  // Debug counters
  let _debugTotalDocs = 0;
  let _debugNdaDocs = 0;
  let _debugPlaceholders = 0;
  for (const doc of docs) {
    _debugTotalDocs++;
    const humanSlug: string | undefined =
      typeof doc.slug === "string" && doc.slug.trim()
        ? doc.slug.trim()
        : undefined;
    const uuid: string | undefined =
      typeof doc.uuid === "string" && doc.uuid.trim()
        ? doc.uuid.trim()
        : undefined;

    // Map relationship brandId → brand slug/id string and resolve logo URLs when available
    let brandId = "";
    let brandIsNda = false;
    let brandLogoLightUrl: string | undefined;
    let brandLogoDarkUrl: string | undefined;
    const b: BrandRel | undefined = doc.brandId;
    // Helper to extract upload URL from a value that could be string | object
    const extractUploadUrl = (val: unknown): string | undefined => {
      if (!val) return undefined;
      if (typeof val === "string") return undefined; // only an ID; no URL at this depth
      if (Array.isArray(val)) {
        const first = val[0] as Record<string, unknown> | undefined;
        return first && typeof first === "object"
          ? (first.url as string | undefined)
          : undefined;
      }
      if (typeof val === "object") {
        return (val as Record<string, unknown>).url as string | undefined;
      }
      return undefined;
    };
    if (typeof b === "string") {
      brandId = b;
    } else if (Array.isArray(b)) {
      const first: BrandObj | undefined = b[0];
      brandId = (first && (first.slug || first.id)) || "";
      // Attempt to resolve NDA and logos from first entry if populated
      if (first && typeof first === "object") {
        brandIsNda = !!first.nda;
        brandLogoLightUrl = extractUploadUrl(first.logoLight);
        brandLogoDarkUrl = extractUploadUrl(first.logoDark);
      }
    } else if (b && typeof b === "object") {
      const bo: BrandObj = b as BrandObj;
      brandId = bo.slug || bo.id || "";
      brandIsNda = !!bo.nda;
      brandLogoLightUrl = extractUploadUrl(bo.logoLight);
      brandLogoDarkUrl = extractUploadUrl(bo.logoDark);
    }

    // Shared helpers for upload documents (thumbnails/screenshots).
    interface UploadSize {
      url?: string;
      width?: number;
      height?: number;
    }
    interface UploadDocLike {
      url?: string;
      alt?: string;
      updatedAt?: string; // used for cache-busting
      sizes?: Record<string, UploadSize> & {
        mobile?: UploadSize;
        thumbnail?: UploadSize;
      };
    }
    interface ScreenshotDocLike extends UploadDocLike {
      screenType?: "laptop" | "phone";
      orientation?: "portrait" | "landscape";
      filename?: string;
    }
    const isUploadDocLike = (val: unknown): val is UploadDocLike => {
      return (
        !!val &&
        typeof val === "object" &&
        ("url" in (val as Record<string, unknown>) ||
          "sizes" in (val as Record<string, unknown>) ||
          "alt" in (val as Record<string, unknown>))
      );
    };
    const firstUploadDoc = (val: unknown): UploadDocLike | undefined => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.find(isUploadDocLike);
      return isUploadDocLike(val) ? val : undefined;
    };
    const isScreenshotDocLike = (val: unknown): val is ScreenshotDocLike => {
      return (
        !!val &&
        typeof val === "object" &&
        ("screenType" in (val as Record<string, unknown>) ||
          "url" in (val as Record<string, unknown>))
      );
    };

    // Resolve optional locked thumbnail early so NDA placeholders can render it.
    let lockedThumbUrl: string | undefined;
    let lockedThumbAlt: string | undefined;
    const lockedThumbDoc = firstUploadDoc(doc.lockedThumbnail);
    if (lockedThumbDoc) {
      const baseLockedUrl =
        lockedThumbDoc.url ||
        lockedThumbDoc.sizes?.thumbnail?.url ||
        lockedThumbDoc.sizes?.mobile?.url ||
        undefined;
      lockedThumbUrl = baseLockedUrl || undefined;
      lockedThumbAlt = lockedThumbDoc.alt || undefined;
    }

    // Frontend defense-in-depth: if either the project itself or its brand
    // is NDA and the caller lacks auth, emit a sanitized placeholder instead
    // of leaking teaser metadata.
    const projectIsNda = Boolean(doc.nda || brandIsNda);

    // Route/data key rules:
    // - Public projects: must use the human slug.
    // - NDA-like projects:
    //   - Authenticated: prefer human slug (canonical), fallback to UUID.
    //   - Unauthenticated: MUST use UUID (slug may be redacted) to avoid slug exposure.
    const routeKey: string | undefined = projectIsNda
      ? hasNdaAccess
        ? humanSlug || uuid
        : uuid
      : humanSlug;
    if (!routeKey) continue;

    if (projectIsNda && !hasNdaAccess) {
      _debugNdaDocs++;
      out[routeKey] = {
        title: "Confidential Project",
        uuid,
        active: !!doc.active,
        omitFromList: !!doc.omitFromList,
        brandId: "",
        brandIsNda: Boolean(brandIsNda || doc.nda),
        isSanitized: true,
        mobileOrientation: MobileOrientations.NONE,
        tags: [],
        role: "",
        year: undefined,
        awards: undefined,
        type: undefined,
        desc: [],
        date: "",
        urls: {},
        nda: true,
        sortIndex:
          typeof doc.sortIndex === "number" ? doc.sortIndex : undefined,
        thumbUrl: undefined,
        thumbAlt: undefined,
        lockedThumbUrl,
        lockedThumbAlt,
        brandLogoLightUrl: undefined,
        brandLogoDarkUrl: undefined,
        screenshotUrls: {},
      };
      _debugPlaceholders++;
      if (debug) {
        try {
          console.info("[ProjectData] NDA placeholder emitted", {
            routeKey,
            sortIndex: typeof doc.sortIndex === "number" ? doc.sortIndex : null,
          });
        } catch {}
      }
      continue;
    }

    const tags = Array.isArray(doc.tags)
      ? doc.tags.map((t) => t?.tag).filter((x): x is string => !!x)
      : [];
    const role = Array.isArray(doc.role)
      ? doc.role
          .map((r) => r?.value)
          .filter((x): x is string => !!x)
          .join(", ")
      : typeof doc.role === "string"
        ? doc.role
        : "";
    const awards = Array.isArray(doc.awards)
      ? doc.awards
          .map((a) => a?.award)
          .filter((x): x is string => !!x)
          .join(", ")
      : typeof doc.awards === "string"
        ? doc.awards
        : "";
    const desc = Array.isArray(doc.desc)
      ? doc.desc.map((d) => d?.block).filter((x): x is string => !!x)
      : [];
    const urlsArray = Array.isArray(doc.urls) ? doc.urls : [];
    const urls: Record<string, string | string[]> = {};
    for (const u of urlsArray) {
      if (u?.label && u?.url) urls[u.label] = u.url;
    }

    // Extract first thumbnail URL/alt if present without using `any`
    let thumbUrl: string | undefined;
    let thumbAlt: string | undefined;
    const thumbDoc = firstUploadDoc(doc.thumbnail);
    if (thumbDoc) {
      // Use canonical URL directly; rely on standard cache headers instead of version query strings.
      const baseUrl =
        thumbDoc.url || thumbDoc.sizes?.thumbnail?.url || undefined;
      thumbUrl = baseUrl || undefined;
      thumbAlt = thumbDoc.alt || undefined;
    }

    // Map first laptop/phone screenshot URLs from relationship (if provided)
    let laptopUrl: string | undefined;
    let phoneUrl: string | undefined;
    // Derive mobile status (Portrait/Landscape) from the first phone screenshot (for now)
    // because orientation belongs to the screenshot/device, not the project itself,
    // So hypothetically, we could add views with tablets, etc. in the future, all
    // different orientations.
    let derivedMobileOrientation: MobileOrientation = MobileOrientations.NONE;
    const ss = Array.isArray(doc.screenshots) ? doc.screenshots : [];
    for (const entry of ss) {
      if (!isScreenshotDocLike(entry)) continue;
      const base = entry.url;
      if (!base) continue;

      // Use raw URL without version query params; file changes will naturally invalidate caches when URL changes.
      const url = base;
      if (entry.screenType === "laptop" && !laptopUrl) {
        laptopUrl = url;
      } else if (entry.screenType === "phone" && !phoneUrl) {
        phoneUrl = url;
        if (entry.orientation === "portrait") {
          derivedMobileOrientation = MobileOrientations.PORTRAIT;
        } else if (entry.orientation === "landscape") {
          derivedMobileOrientation = MobileOrientations.LANDSCAPE;
        }
      }

      // Early exit if we have what we need
      if (laptopUrl && phoneUrl) break;
    }

    // If brand OR project is NDA on public requests, ensure we don't expose logos client-side
    // Allow logos when the request includes an auth cookie (SSR for logged-in users)
    if ((brandIsNda || !!doc.nda) && !hasNdaAccess) {
      brandLogoLightUrl = undefined;
      brandLogoDarkUrl = undefined;
    }

    const item: PortfolioProjectBase = {
      title: doc.title || "Untitled",
      uuid,
      active: !!doc.active,
      omitFromList: !!doc.omitFromList,
      brandId,
      brandIsNda,
      mobileOrientation: derivedMobileOrientation,
      tags,
      role,
      year: doc.year,
      awards,
      type: doc.type,
      desc,
      date: doc.date || "",
      urls,
      nda: !!doc.nda,
      sortIndex: typeof doc.sortIndex === "number" ? doc.sortIndex : undefined,
      thumbUrl,
      thumbAlt,
      lockedThumbUrl,
      lockedThumbAlt,
      brandLogoLightUrl,
      brandLogoDarkUrl,
      screenshotUrls: {
        laptop: laptopUrl,
        phone: phoneUrl,
      },
    };

    out[routeKey] = item;
  }

  // Debug summary of fetch/transform results
  if (debug) {
    try {
      console.info("[ProjectData] summary", {
        totalDocs: _debugTotalDocs,
        ndaDocsSeen: _debugNdaDocs,
        ndaPlaceholdersEmitted: _debugPlaceholders,
        outCount: Object.keys(out).length,
      });
    } catch {}
  }

  return {
    data: out,
    metadata: {
      containsSanitizedPlaceholders: _debugPlaceholders > 0,
      hasNdaAccess,
    },
  };
}

// Define constants for MobileOrientation
export const MobileOrientations = {
  PORTRAIT: "Portrait",
  LANDSCAPE: "Landscape",
  NONE: "none",
} as const;

export type MobileOrientation =
  (typeof MobileOrientations)[keyof typeof MobileOrientations];

export interface PortfolioProjectBase {
  title: string;
  /** Optional opaque identifier usable as an alternate route key (e.g., /nda/<uuid>/). */
  uuid?: string;
  active: boolean;
  omitFromList: boolean;
  brandId: string;
  /** True when brand is NDA; use to hide logo exposure in public UI. */
  brandIsNda?: boolean;
  /** Optional logo for light backgrounds (from Brand.logoLight relation). */
  brandLogoLightUrl?: string;
  /** Optional logo for dark backgrounds (from Brand.logoDark relation). */
  brandLogoDarkUrl?: string;
  mobileOrientation: MobileOrientation;
  tags: string[];
  role: string;
  year?: string;
  awards?: string;
  type?: string;
  desc: string[];
  date: string;
  urls: Record<string, string | string[]>;
  nda?: boolean;
  sortIndex?: number;
  thumbUrl?: string;
  thumbAlt?: string;
  lockedThumbUrl?: string;
  lockedThumbAlt?: string;
  /** True when the server redacted NDA details due to missing auth. */
  isSanitized?: boolean;
  /** Optional direct URLs for device screenshots resolved from Payload uploads. */
  screenshotUrls?: {
    laptop?: string;
    phone?: string;
  };
}

export interface ParsedPortfolioProject extends PortfolioProjectBase {
  id: string;
  // TODO: This index would be wrong with the assumption that it's in the
  // context of the active projects vs all projects. It should probably
  // be renamed and another index should be added for the active projects.
  index: number;
  nda?: boolean;
}

export type PortfolioProjectData = Record<string, PortfolioProjectBase>;
export type ParsedPortfolioProjectData = Record<string, ParsedPortfolioProject>;

export const projectRequiresNda = (
  project?: Pick<ParsedPortfolioProject, "nda" | "brandIsNda">,
): boolean => {
  return Boolean(project?.nda || project?.brandIsNda);
};

export interface ProjectDataHydrationOptions {
  includeNdaInActive: boolean;
  /** True when the backend redacted NDA rows, meaning the request was unauthenticated. */
  containsSanitizedPlaceholders?: boolean;
}

export type ProjectDataInitializeOptions = {
  headers?: HeadersInit;
  disableCache?: boolean;
  includeNdaInActive?: boolean;
};

export type ProjectDataInitializeResult = ProjectDataHydrationOptions;

/**
 * A helper class for accessing and manipulating portfolio project data.
 * Handles data parsing, filtering, and navigation operations.
 *
 */
export class ProjectDataStore {
  private _projects: ParsedPortfolioProjectData = {};
  private _activeProjects: ParsedPortfolioProject[] = [];
  private _activeKeys: string[] = [];
  private _listedProjects: ParsedPortfolioProject[] = [];
  private _listedKeys: string[] = [];
  private _keys: string[] = [];
  private _activeProjectsMap: Record<string, ParsedPortfolioProject> = {};
  private _uuidToKey: Record<string, string> = {};
  private _includeNdaInActive = false;
  private _containsSanitizedPlaceholders = false;
  // Prevent overlapping initialize() calls from interleaving state writes.
  private _initInFlight: Promise<ProjectDataInitializeResult> | null = null;

  private resetCaches() {
    this._projects = {} as ParsedPortfolioProjectData;
    this._activeProjects = [];
    this._activeKeys = [];
    this._listedProjects = [];
    this._listedKeys = [];
    this._keys = [];
    this._activeProjectsMap = {};
    this._uuidToKey = {};
  }

  /**
   * Hydrate caches from a parsed snapshot (SSR → CSR) and recompute active/listed sets.
   * Use this on the client to avoid an immediate refetch that could drop NDA fields
   * when the browser lacks a backend-auth cookie scoped to the frontend domain.
   */
  hydrate(
    parsed: ParsedPortfolioProjectData,
    includeNdaInActive: boolean,
    metadata?: Pick<
      ProjectDataHydrationOptions,
      "containsSanitizedPlaceholders"
    >,
  ) {
    // Reset caches
    this.resetCaches();
    this._includeNdaInActive = includeNdaInActive;
    // Preserve SSR metadata so client reads can align with server auth state.
    this._containsSanitizedPlaceholders = Boolean(
      metadata?.containsSanitizedPlaceholders,
    );

    // Assign snapshot
    this._projects = { ...parsed };
    this._keys = Object.keys(this._projects);

    // Build UUID lookup from snapshot
    this._uuidToKey = {};
    for (const key of this._keys) {
      const u = this._projects[key]?.uuid;
      if (typeof u === "string" && u.trim()) {
        const uuid = u.trim();
        if (!this._uuidToKey[uuid]) this._uuidToKey[uuid] = key;
      }
    }

    // Preserve sort order by sortIndex then title
    this._keys.sort((a, b) => {
      const aa = this._projects[a]?.sortIndex;
      const bb = this._projects[b]?.sortIndex;
      const av = typeof aa === "number" ? aa : Number.MAX_SAFE_INTEGER;
      const bv = typeof bb === "number" ? bb : Number.MAX_SAFE_INTEGER;
      if (av !== bv) return av - bv;
      const at = this._projects[a]?.title || "";
      const bt = this._projects[b]?.title || "";
      return at.localeCompare(bt);
    });

    for (const key of this._keys) {
      const project = this._projects[key];
      if (!project?.active) continue;
      const requiresNda = projectRequiresNda(project);
      if (!requiresNda || includeNdaInActive) {
        this._activeKeys.push(key);
        this._activeProjects.push(project);
        this._activeProjectsMap[key] = project;
        if (!project.omitFromList) {
          this._listedKeys.push(key);
          this._listedProjects.push(project);
        }
      } else {
        if (!project.omitFromList) {
          this._listedKeys.push(key);
          this._listedProjects.push(project);
        }
      }
    }

    // Normalize duplicates in dev to avoid UI warnings
    const dupes = (arr: string[]) =>
      Array.from(new Set(arr.filter((k, i, a) => a.indexOf(k) !== i)));
    const activeDupes = dupes(this._activeKeys);
    const listedDupes = dupes(this._listedKeys);
    if (activeDupes.length || listedDupes.length) {
      if (process.env.NODE_ENV !== "production") {
        this._activeKeys = Array.from(new Set(this._activeKeys));
        this._listedKeys = Array.from(new Set(this._listedKeys));
        this._activeProjects = this._activeKeys
          .map((k) => this._projects[k])
          .filter(Boolean);
        this._listedProjects = this._listedKeys
          .map((k) => this._projects[k])
          .filter(Boolean);
        this._activeProjectsMap = this._activeKeys.reduce(
          (acc, k) => {
            const p = this._projects[k];
            if (p) acc[k] = p;
            return acc;
          },
          {} as Record<string, ParsedPortfolioProject>,
        );
      }
    }
  }

  get activeKeys(): string[] {
    return [...this._activeKeys]; // Shallow copy to prevent mutations
  }

  get listedKeys(): string[] {
    return [...this._listedKeys];
  }

  get listedProjects(): ParsedPortfolioProject[] {
    return [...this._listedProjects];
  }

  get activeProjects(): ParsedPortfolioProject[] {
    return [...this._activeProjects];
  }

  get activeProjectsRecord(): Record<string, ParsedPortfolioProject> {
    return this._activeProjects.reduce(
      (record, project) => {
        if (!project.id) {
          throw new Error(`Project ${project.id} ID is missing.`);
        }
        if (typeof project.index !== "number") {
          throw new Error(`Project ${project.id} index is missing.`);
        }
        record[project.id] = project;
        if (typeof project.uuid === "string" && project.uuid.trim()) {
          const u = project.uuid.trim();
          if (!record[u]) record[u] = project;
        }
        return record;
      },
      {} as Record<string, ParsedPortfolioProject>,
    );
  }

  get projectsRecord(): ParsedPortfolioProjectData {
    return Object.entries(this._projects).reduce((record, [key, project]) => {
      if (project) record[key] = { ...project };
      return record;
    }, {} as ParsedPortfolioProjectData);
  }

  get includeNdaInActive(): boolean {
    return this._includeNdaInActive;
  }

  get containsSanitizedPlaceholders(): boolean {
    return this._containsSanitizedPlaceholders;
  }

  /**
   * Returns the parsed project by id from the full dataset (including NDA),
   * regardless of whether it is currently included in the active set.
   */
  getProject(id: string): ParsedPortfolioProject | undefined {
    const direct = this._projects[id];
    if (direct) return direct;
    const key = this._uuidToKey[id];
    return key ? this._projects[key] : undefined;
  }

  /**
   * Parses raw portfolio data into strongly typed ParsedPortfolioProjectData.
   *
   * @param data Raw JSON data
   * @returns Parsed portfolio data
   */
  private parsePortfolioData(
    data: PortfolioProjectData,
  ): ParsedPortfolioProjectData {
    const parsedData: ParsedPortfolioProjectData = {};

    // Rebuild UUID lookup on every parse.
    this._uuidToKey = {};

    for (const [index, key] of Object.keys(data).entries()) {
      const item = data[key];

      if (item && typeof item.uuid === "string" && item.uuid.trim()) {
        const u = item.uuid.trim();
        // Prefer first-seen mapping to avoid collisions silently overriding.
        if (!this._uuidToKey[u]) this._uuidToKey[u] = key;
      }

      parsedData[key] = {
        ...item,
        id: key,
        index: index,
      };
    }

    return parsedData;
  }

  /**
   * Initializes the ProjectData class by parsing raw JSON and organizing projects.
   */
  async initialize(
    opts?: ProjectDataInitializeOptions,
  ): Promise<ProjectDataInitializeResult> {
    // Coalesce concurrent calls: later callers await the same run
    if (this._initInFlight) {
      return this._initInFlight;
    }

    this._initInFlight = (async () => {
      const { data: typedUnprocessedProjects, metadata } =
        await fetchPortfolioProjects({
          requestHeaders: opts?.headers,
          disableCache: opts?.disableCache,
        });

      // Reset caches AFTER awaiting network to avoid race conditions where
      // overlapping calls each reset, then both push, causing duplicates.
      this.resetCaches();

      this._keys = Object.keys(typedUnprocessedProjects);
      this._projects = this.parsePortfolioData(typedUnprocessedProjects);

      // Fallback local sort by sortIndex if provided (lower numbers first)
      this._keys.sort((a, b) => {
        const aa = this._projects[a]?.sortIndex;
        const bb = this._projects[b]?.sortIndex;
        const av = typeof aa === "number" ? aa : Number.MAX_SAFE_INTEGER;
        const bv = typeof bb === "number" ? bb : Number.MAX_SAFE_INTEGER;
        if (av !== bv) return av - bv;
        // tie-break by title to keep stable ordering
        const at = this._projects[a]?.title || "";
        const bt = this._projects[b]?.title || "";
        return at.localeCompare(bt);
      });

      // Determine if NDA projects should be included as active for this initialization
      const includeNdaInActive = (() => {
        if (typeof opts?.includeNdaInActive === "boolean") {
          return opts.includeNdaInActive;
        }
        if (typeof metadata.hasNdaAccess === "boolean") {
          return metadata.hasNdaAccess;
        }
        return headersContainPayloadSession(opts?.headers);
      })();
      this._includeNdaInActive = includeNdaInActive;
      // Mirror backend decision about whether this response contained placeholders.
      this._containsSanitizedPlaceholders = Boolean(
        metadata.containsSanitizedPlaceholders,
      );

      for (const key of this._keys) {
        const project = this._projects[key];
        if (!project.active) continue;
        const requiresNda = projectRequiresNda(project);

        if (!requiresNda || includeNdaInActive) {
          // Non-NDA: included in active navigation and list (unless omitted)
          this._activeKeys.push(key);
          this._activeProjects.push(project);
          this._activeProjectsMap[key] = project;

          if (!project.omitFromList) {
            this._listedKeys.push(key);
            this._listedProjects.push(project);
          }
        } else {
          // NDA: not part of active navigation, but can appear in the list as placeholder
          if (!project.omitFromList) {
            this._listedKeys.push(key);
            this._listedProjects.push(project);
          }
        }
      }

      // Detect and always log duplicates; only normalize in development
      const dupes = (arr: string[]) =>
        Array.from(new Set(arr.filter((k, i, a) => a.indexOf(k) !== i)));
      const activeDupes = dupes(this._activeKeys);
      const listedDupes = dupes(this._listedKeys);
      if (activeDupes.length || listedDupes.length) {
        if (
          process.env.DEBUG_PROJECT_DATA === "1" &&
          process.env.NODE_ENV !== "production"
        )
          console.warn("[ProjectData.initialize] Duplicate keys detected", {
            activeDupes,
            listedDupes,
          });
        if (process.env.NODE_ENV !== "production") {
          // Normalize to unique to avoid UI warnings during dev only
          this._activeKeys = Array.from(new Set(this._activeKeys));
          this._listedKeys = Array.from(new Set(this._listedKeys));
          this._activeProjects = this._activeKeys
            .map((k) => this._projects[k])
            .filter(Boolean);
          this._listedProjects = this._listedKeys
            .map((k) => this._projects[k])
            .filter(Boolean);
          this._activeProjectsMap = this._activeKeys.reduce(
            (acc, k) => {
              const p = this._projects[k];
              if (p) acc[k] = p;
              return acc;
            },
            {} as Record<string, ParsedPortfolioProject>,
          );
        }
      }
      return {
        includeNdaInActive,
        containsSanitizedPlaceholders: Boolean(
          metadata.containsSanitizedPlaceholders,
        ),
      } satisfies ProjectDataInitializeResult;
    })();

    try {
      return await this._initInFlight;
    } finally {
      this._initInFlight = null;
    }
  }

  /**
   * Returns the index of a project by its key.
   *
   * @param key Project key
   * @returns Index in the active project list
   */
  projectIndex(key: string): number {
    const resolved = this._uuidToKey[key] || key;
    return this._activeKeys.indexOf(resolved);
  }

  /**
   * Returns the key of the previous project in the active list.
   *
   * @param key Current project key
   * @returns Previous project key
   */
  prevKey(key: string): string {
    const index = this.projectIndex(key);
    return this._activeKeys[
      (index - 1 + this._activeKeys.length) % this._activeKeys.length
    ];
  }

  /**
   * Returns the key of the next project in the active list.
   *
   * @param key Current project key
   * @returns Next project key
   */
  nextKey(key: string): string {
    const index = this.projectIndex(key);
    return this._activeKeys[(index + 1) % this._activeKeys.length];
  }
}

const projectDataSingleton = new ProjectDataStore();

export default projectDataSingleton;
