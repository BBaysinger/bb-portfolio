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
  const profile = (
    process.env.ENV_PROFILE ||
    process.env.NODE_ENV ||
    ""
  ).toLowerCase();
  const prefix = profile ? `${profile.toUpperCase()}_` : "";
  // Return the VALUE of the first defined env var (not the name)
  const firstVal = (names: string[]) => {
    for (const n of names) {
      const v = process.env[n];
      if (v) return v;
    }
    return "";
  };
  const base =
    firstVal([
      `${prefix}BACKEND_INTERNAL_URL`,
      `${prefix}NEXT_PUBLIC_BACKEND_URL`,
    ]) ||
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "";

  // Conventional: rely on Next.js rewrites for /api/* on the server.
  // Fail fast if .env is incomplete so misconfigurations are obvious.
  const isHttpUrl = (s: string) => /^https?:\/\//i.test(s);
  if (isServer && !isHttpUrl(base)) {
    const msg =
      "Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL (or BACKEND_INTERNAL_URL) to a valid http(s) URL so Next rewrites can proxy /api/*.";
    console.error(`ProjectData: ${msg}`);
    throw new Error(msg);
  }

  // Build URL: server uses absolute backend URL; client can use relative path
  // We need depth=2 so that nested relations on brand (logoLight/logoDark uploads)
  // are populated alongside the project -> brand -> upload chain.
  const path = "/api/projects?depth=2&limit=1000&sort=sortIndex";
  const url = isServer ? `${base.replace(/\/$/, "")}${path}` : path;

  const fetchOptions: RequestInit & { next?: { revalidate?: number } } = {};
  if (disableCache) {
    fetchOptions.cache = "no-store";
  } else {
    fetchOptions.next = { revalidate: 3600 };
  }
  if (requestHeaders) {
    fetchOptions.headers = requestHeaders;
    fetchOptions.credentials = "include";
  }

  const res = await fetch(url, fetchOptions);
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
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
  const docs: PayloadProjectDoc[] = json.docs;
  for (const doc of docs) {
    const slug: string | undefined = doc.slug || doc.id;
    if (!slug) continue;

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
    if (thumbDoc) {
      // Prefer a sized thumbnail URL when available
      const baseUrl =
        thumbDoc.sizes?.thumbnail?.url || thumbDoc.url || undefined;
      // Append a version param derived from the upload's updatedAt to bust caches when overwriting same filename
      const version = thumbDoc.updatedAt
        ? Date.parse(thumbDoc.updatedAt)
        : undefined;
      thumbUrl = baseUrl
        ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${version ? `v=${version}` : "v=1"}`
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
    if (brandIsNda || !!doc.nda) {
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
 * @author Bradley Baysinger
 * @since 2025
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
  }): Promise<void> {
    // Reset caches to support re-initialization per-request when needed
    this._projects = {} as ParsedPortfolioProjectData;
    this._activeProjects = [];
    this._activeKeys = [];
    this._listedProjects = [];
    this._listedKeys = [];
    this._keys = [];
    this._activeProjectsMap = {};

    const typedUnprocessedProjects = await fetchPortfolioProjects({
      requestHeaders: opts?.headers,
      disableCache: opts?.disableCache,
    });
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

    for (const key of this._keys) {
      const project = this._projects[key];
      if (!project.active) continue;

      if (!project.nda) {
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
