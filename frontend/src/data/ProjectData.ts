import rawJson from "data/portfolio-projects.json";

const typedUnprocessedProjects = rawJson as PortfolioProjectData;

// Define constants for MobileOrientation
export const MobileStatuses = {
  PORTRAIT: "portrait",
  LANDSCAPE: "landscape",
  NONE: "none",
} as const;

export type MobileStatus = (typeof MobileStatuses)[keyof typeof MobileStatuses];

export interface PortfolioProjectBase {
  title: string;
  active: boolean;
  omitFromList: boolean;
  clientId: string;
  mobileStatus: MobileStatus;
  tags: string[];
  role: string;
  year?: string;
  awards?: string;
  type?: string;
  desc: string[];
  date: string;
  urls: Record<string, string | string[]>;
}

export interface ParsedPortfolioProject extends PortfolioProjectBase {
  id: string;
  // TODO: This index would be wrong with the assumption that it's in the
  // context of the active projects vs all projects. It should probably
  // be renamed and another index should be added for the active projects.
  index: number;
}

export type PortfolioProjectData = Record<string, PortfolioProjectBase>;
export type ParsedPortfolioProjectData = Record<string, ParsedPortfolioProject>;

/**
 * A helper class for accessing and manipulating portfolio project data.
 * Handles data parsing, filtering, and navigation operations.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 */
export default class ProjectData {
  private static _projects: ParsedPortfolioProjectData = {};
  private static _activeProjects: ParsedPortfolioProject[] = [];
  private static _activeKeys: string[] = [];
  private static _listedProjects: ParsedPortfolioProject[] = [];
  private static _listedKeys: string[] = [];
  private static _keys: string[] = Object.keys(typedUnprocessedProjects);
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
  static initialize(): void {
    this._projects = this.parsePortfolioData(typedUnprocessedProjects);

    for (const key of this._keys) {
      const project = this._projects[key];
      if (project.active) {
        this._activeKeys.push(key);
        this._activeProjects.push(project);
        this._activeProjectsMap[key] = project;

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

// Initialize the ProjectData class
ProjectData.initialize();
