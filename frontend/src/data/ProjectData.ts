// Fetch project data from the live API only (no JSON fallback)
// Transforms Payload REST shape { docs: [...] } into a keyed record by slug.
async function fetchPortfolioProjects(opts?: {
  /** Optional request headers to forward (e.g., Cookie for auth-aware results). */
  requestHeaders?: HeadersInit;
  /** Disable cache for per-request SSR. */
  disableCache?: boolean;
}): Promise<PortfolioProjectData> {
  const { requestHeaders, disableCache } = opts || {};
  const isServer = typeof window === "undefined";
  // Support ENV-profile prefixed variables like DEV_BACKEND_INTERNAL_URL, PROD_BACKEND_URL, LOCAL_NEXT_PUBLIC_BACKEND_URL, etc.
  const rawProfile = (
    process.env.ENV_PROFILE ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();
  // Normalize common synonyms so we look up DEV_ vars when NODE_ENV=development
  const normalizedProfile = rawProfile.startsWith("prod")
    ? "prod"
    : rawProfile === "development" || rawProfile.startsWith("dev")
      ? "dev"
      : rawProfile.startsWith("local")
        ? "local"
        : rawProfile;
  const prefix = normalizedProfile ? `${normalizedProfile.toUpperCase()}_` : "";
  // Return the VALUE of the first defined env var (not the name)
  const firstVal = (names: string[]) => {
    for (const n of names) {
      const v = process.env[n];
      if (v) return v;
    }
    return "";
  };
  let base = firstVal([
    `${prefix}BACKEND_INTERNAL_URL`,
    `${prefix}NEXT_PUBLIC_BACKEND_URL`,
    // Fallback to non-prefixed for browser (Next.js only exposes NEXT_PUBLIC_ variables)
    "NEXT_PUBLIC_BACKEND_URL",
  ]);

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
          ? "http://bb-backend-local:3001"
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
  const path = "/api/projects/?depth=2&limit=1000&sort=sortIndex";
  const serverPath = "/api/projects?depth=2&limit=1000&sort=sortIndex";
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

  // Prefer same-origin on the server when cookies are available so the Next.js proxy
  // forwards them to the backend seamlessly. Otherwise, use absolute backend URL.
  const primaryUrl = isServer
    ? hasRequestCookies
      ? serverPath
      : `${base.replace(/\/$/, "")}${serverPath}`
    : path;
  const fallbackUrl =
    isServer && serviceDnsFallback
      ? `${serviceDnsFallback.replace(/\/$/, "")}${serverPath}`
      : undefined;

  const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {};
  if (disableCache) {
    fetchOptions.cache = "no-store";
  } else {
    fetchOptions.next = { revalidate: 3600 };
  }
  if (requestHeaders) {
    fetchOptions.headers = requestHeaders;
    fetchOptions.credentials = "include";
  } else if (!isServer) {
    // Ensure browser requests include auth cookies for NDA-aware responses
    fetchOptions.credentials = "include";
  }

  // Timeout policy: give dev/local a bit more time, prod moderate.
  const baseTimeoutMs =
    normalizedProfile === "dev" || normalizedProfile === "local" ? 8000 : 5000;
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

  const debug = process.env.DEBUG_PROJECT_DATA === "1";
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
  interface PayloadProjectDoc {
    slug?: string;
    id?: string;
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
    screenshots?: unknown; // relationship to projectScreenshots (array)
  }
  interface PayloadProjectsRest {
    docs: PayloadProjectDoc[];
  }
  const json = (await res.json()) as PayloadProjectsRest | PortfolioProjectData;
  // Determine if request is authenticated (server-side with cookies forwarded)
  const hasAuthCookie = (() => {
    const h = requestHeaders;
    if (!h) return false;
    if (Array.isArray(h)) {
      return h.some(([k]) => k.toLowerCase() === "cookie");
    }
    if (h instanceof Headers) {
      return !!h.get("cookie");
    }
    // Plain object
    const lowerKeys = Object.keys(h as Record<string, string>).map((k) =>
      k.toLowerCase(),
    );
    return lowerKeys.includes("cookie");
  })();

  // Type guard to detect Payload REST shape
  const isPayloadRest = (val: unknown): val is PayloadProjectsRest => {
    return (
      typeof val === "object" &&
      val !== null &&
      Array.isArray((val as Record<string, unknown>).docs)
    );
  };

  if (!isPayloadRest(json)) {
    // Already in expected record form
    return json as PortfolioProjectData;
  }

  const out: PortfolioProjectData = {};
  // Debug counters
  let _debugTotalDocs = 0;
  let _debugNdaDocs = 0;
  let _debugPlaceholders = 0;
  const docs: PayloadProjectDoc[] = json.docs;
  for (const doc of docs) {
    _debugTotalDocs++;
    const slug: string | undefined = doc.slug || doc.id;
    if (!slug) continue;

    // Frontend defense-in-depth: if this is an NDA project and the request
    // clearly lacks auth cookies, do NOT expose any teaser data.
    // Instead, include a sanitized placeholder entry so the UI can render
    // a generic "Confidential Project" tile without leaking details.
    if (doc.nda && !hasAuthCookie) {
      _debugNdaDocs++;
      out[slug] = {
        title: "Confidential Project",
        active: !!doc.active,
        omitFromList: !!doc.omitFromList,
        brandId: "",
        brandIsNda: true,
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
        thumbUrlMobile: undefined,
        thumbAlt: undefined,
        brandLogoLightUrl: undefined,
        brandLogoDarkUrl: undefined,
        screenshotUrls: {},
      };
      _debugPlaceholders++;
      continue;
    }

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
    let thumbUrl: string | undefined;
    let thumbAlt: string | undefined;
    const thumbDoc = firstUploadDoc(doc.thumbnail);
    let thumbUrlMobile: string | undefined;
    if (thumbDoc) {
      // Store multiple size URLs so components can choose responsively
      const version = thumbDoc.updatedAt
        ? Date.parse(thumbDoc.updatedAt)
        : undefined;
      const versionParam = version ? `v=${version}` : "v=1";

      // Full resolution URL (for medium/large viewports)
      const fullUrl =
        thumbDoc.url || thumbDoc.sizes?.thumbnail?.url || undefined;
      thumbUrl = fullUrl
        ? `${fullUrl}${fullUrl.includes("?") ? "&" : "?"}${versionParam}`
        : undefined;

      // Mobile size URL (400x300, for small viewports)
      const mobileUrl =
        thumbDoc.sizes?.mobile?.url ||
        thumbDoc.sizes?.thumbnail?.url ||
        thumbDoc.url ||
        undefined;
      thumbUrlMobile = mobileUrl
        ? `${mobileUrl}${mobileUrl.includes("?") ? "&" : "?"}${versionParam}`
        : undefined;

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

      const v = entry.updatedAt ? Date.parse(entry.updatedAt) : undefined;
      // Cache-busting version param
      const url = `${base}${base.includes("?") ? "&" : "?"}${v ? `v=${v}` : "v=1"}`;
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
    if ((brandIsNda || !!doc.nda) && !hasAuthCookie) {
      brandLogoLightUrl = undefined;
      brandLogoDarkUrl = undefined;
    }

    const item: PortfolioProjectBase = {
      title: doc.title || "Untitled",
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
      thumbUrlMobile,
      thumbAlt,
      brandLogoLightUrl,
      brandLogoDarkUrl,
      screenshotUrls: {
        laptop: laptopUrl,
        phone: phoneUrl,
      },
    };

    out[slug] = item;
  }

  // Debug summary of fetch/transform results
  if (
    process.env.DEBUG_PROJECT_DATA === "1" ||
    process.env.NODE_ENV !== "production"
  ) {
    try {
      console.info("[ProjectData] summary", {
        totalDocs: _debugTotalDocs,
        ndaDocsSeen: _debugNdaDocs,
        ndaPlaceholdersEmitted: _debugPlaceholders,
        outCount: Object.keys(out).length,
      });
    } catch {}
  }

  return out;
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
  thumbUrlMobile?: string;
  thumbAlt?: string;
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

/**
 * A helper class for accessing and manipulating portfolio project data.
 * Handles data parsing, filtering, and navigation operations.
 *
 */
export default class ProjectData {
  private static _projects: ParsedPortfolioProjectData = {};
  private static _activeProjects: ParsedPortfolioProject[] = [];
  private static _activeKeys: string[] = [];
  private static _listedProjects: ParsedPortfolioProject[] = [];
  private static _listedKeys: string[] = [];
  private static _keys: string[] = [];
  private static _activeProjectsMap: Record<string, ParsedPortfolioProject> =
    {};
  // Prevent overlapping initialize() calls from interleaving state writes.
  private static _initInFlight: Promise<void> | null = null;

  /**
   * Hydrate caches from a parsed snapshot (SSR → CSR) and recompute active/listed sets.
   * Use this on the client to avoid an immediate refetch that could drop NDA fields
   * when the browser lacks a backend-auth cookie scoped to the frontend domain.
   */
  static hydrate(
    parsed: ParsedPortfolioProjectData,
    includeNdaInActive: boolean,
  ) {
    // Reset caches
    this._projects = {} as ParsedPortfolioProjectData;
    this._activeProjects = [];
    this._activeKeys = [];
    this._listedProjects = [];
    this._listedKeys = [];
    this._keys = [];
    this._activeProjectsMap = {};

    // Assign snapshot
    this._projects = { ...parsed };
    this._keys = Object.keys(this._projects);

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
      if (!project.nda || includeNdaInActive) {
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

  static get activeKeys(): string[] {
    return [...this._activeKeys]; // Shallow copy to prevent mutations
  }

  static get listedKeys(): string[] {
    return [...this._listedKeys];
  }

  static get listedProjects(): ParsedPortfolioProject[] {
    return [...this._listedProjects];
  }

  static get activeProjects(): ParsedPortfolioProject[] {
    return [...this._activeProjects];
  }

  static get activeProjectsRecord(): Record<string, ParsedPortfolioProject> {
    return this._activeProjects.reduce(
      (record, project) => {
        if (!project.id) {
          throw new Error(`Project ${project.id} ID is missing.`);
        }
        if (typeof project.index !== "number") {
          throw new Error(`Project ${project.id} index is missing.`);
        }
        record[project.id] = project;
        return record;
      },
      {} as Record<string, ParsedPortfolioProject>,
    );
  }

  /**
   * Parses raw portfolio data into strongly typed ParsedPortfolioProjectData.
   *
   * @param data Raw JSON data
   * @returns Parsed portfolio data
   */
  private static parsePortfolioData(
    data: PortfolioProjectData,
  ): ParsedPortfolioProjectData {
    const parsedData: ParsedPortfolioProjectData = {};

    for (const [index, key] of Object.keys(data).entries()) {
      const item = data[key];

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
  static async initialize(opts?: {
    headers?: HeadersInit;
    disableCache?: boolean;
    /** When true, include NDA projects in active navigation/maps. */
    includeNdaInActive?: boolean;
  }): Promise<void> {
    // Coalesce concurrent calls: later callers await the same run
    if (this._initInFlight) {
      await this._initInFlight;
      return;
    }

    this._initInFlight = (async () => {
      const typedUnprocessedProjects = await fetchPortfolioProjects({
        requestHeaders: opts?.headers,
        disableCache: opts?.disableCache,
      });

      // Reset caches AFTER awaiting network to avoid race conditions where
      // overlapping calls each reset, then both push, causing duplicates.
      this._projects = {} as ParsedPortfolioProjectData;
      this._activeProjects = [];
      this._activeKeys = [];
      this._listedProjects = [];
      this._listedKeys = [];
      this._keys = [];
      this._activeProjectsMap = {};

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
        // Infer from headers: if a Cookie header exists, treat as authenticated SSR
        const h = opts?.headers;
        if (!h) return false;
        if (Array.isArray(h))
          return h.some(([k]) => k.toLowerCase() === "cookie");
        if (h instanceof Headers) return !!h.get("cookie");
        const obj = h as Record<string, string>;
        return Object.keys(obj).some((k) => k.toLowerCase() === "cookie");
      })();

      for (const key of this._keys) {
        const project = this._projects[key];
        if (!project.active) continue;

        if (!project.nda || includeNdaInActive) {
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
    })();

    try {
      await this._initInFlight;
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
  static projectIndex(key: string): number {
    return this._activeKeys.indexOf(key);
  }

  /**
   * Returns the key of the previous project in the active list.
   *
   * @param key Current project key
   * @returns Previous project key
   */
  static prevKey(key: string): string {
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
  static nextKey(key: string): string {
    const index = this.projectIndex(key);
    return this._activeKeys[(index + 1) % this._activeKeys.length];
  }
}

// Usage: await ProjectData.initialize();
