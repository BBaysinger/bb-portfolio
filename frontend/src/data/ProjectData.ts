// Fetch project data from the live API only (no JSON fallback)
// Transforms Payload REST shape { docs: [...] } into a keyed record by slug.
async function fetchPortfolioProjects(): Promise<PortfolioProjectData> {
  const isServer = typeof window === "undefined";
  const base =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";

  const apiBase = isServer ? (base ? base.replace(/\/$/, "") : null) : "";
  const url = isServer
    ? apiBase
      ? `${apiBase}/api/projects?depth=1&limit=1000`
      : null
    : "/api/projects?depth=1&limit=1000";

  if (!url) {
    throw new Error(
      "Missing BACKEND URL for server fetch. Set NEXT_PUBLIC_BACKEND_URL or BACKEND_URL (or NEXT_PUBLIC_SITE_URL/SITE_URL) so the server can reach /api/projects.",
    );
  }

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch project data: ${res.status} ${res.statusText}`,
    );
  }
  type BrandRel =
    | string
    | { slug?: string; id?: string }
    | Array<{ slug?: string; id?: string }>;
  interface PayloadProjectDoc {
    slug?: string;
    id?: string;
    title?: string;
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

    // Map relationship brandId → brand slug/id string
    let brandId = "";
    const b: BrandRel | undefined = doc.brandId;
    if (typeof b === "string") {
      brandId = b;
    } else if (Array.isArray(b)) {
      const first = b[0];
      brandId = (first && (first.slug || first.id)) || "";
    } else if (b && typeof b === "object") {
      brandId = b.slug || b.id || "";
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

    const item: PortfolioProjectBase = {
      title: doc.title || "Untitled",
      active: !!doc.active,
      omitFromList: !!doc.omitFromList,
      brandId,
      mobileStatus: MobileStatuses.NONE,
      tags,
      role,
      year: doc.year,
      awards,
      type: doc.type,
      desc,
      date: doc.date || "",
      urls,
      nda: !!doc.nda,
    };

    out[slug] = item;
  }

  return out;
}

// Define constants for MobileOrientation
export const MobileStatuses = {
  PORTRAIT: "Portrait",
  LANDSCAPE: "Landscape",
  NONE: "none",
} as const;

export type MobileStatus = (typeof MobileStatuses)[keyof typeof MobileStatuses];

export interface PortfolioProjectBase {
  title: string;
  active: boolean;
  omitFromList: boolean;
  brandId: string;
  mobileStatus: MobileStatus;
  tags: string[];
  role: string;
  year?: string;
  awards?: string;
  type?: string;
  desc: string[];
  date: string;
  urls: Record<string, string | string[]>;
  nda?: boolean;
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
  static async initialize(): Promise<void> {
    const typedUnprocessedProjects = await fetchPortfolioProjects();
    this._keys = Object.keys(typedUnprocessedProjects);
    this._projects = this.parsePortfolioData(typedUnprocessedProjects);

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
