import rawJson from "data/portfolioProjects.json";

const typedUnprocessedProjects = rawJson as PortfolioProjectData;

// Define constants for MobileOrientation
export const MobileOrientations = {
  PORTRAIT: "portrait",
  LANDSCAPE: "landscape",
} as const;

export type MobileOrientation =
  (typeof MobileOrientations)[keyof typeof MobileOrientations];

export interface PortfolioProjectBase {
  title: string;
  active: boolean;
  omitFromList: boolean;
  clientId: string;
  mobileOrientation?: MobileOrientation;
  tags: string;
  role: string;
  year?: string;
  awards?: string;
  type?: string;
  isGame: boolean;
  mobileCompatible: boolean;
  desc: string[];
  urls: Record<string, string | string[]>;
}

export interface ParsedPortfolioProject extends PortfolioProjectBase {
  id: string;
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
  private static keys: string[] = Object.keys(typedUnprocessedProjects);
  private static activeProjectsMap: Record<string, ParsedPortfolioProject> = {};

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

  static get activeProjectsRecord(): Record<string, PortfolioProjectBase> {
    return this._activeProjects.reduce(
      (record, project) => {
        if (!project.id) {
          throw new Error("Project ID is missing.");
        }
        record[project.id] = project;
        return record;
      },
      {} as Record<string, PortfolioProjectBase>,
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

    for (const key of Object.keys(data)) {
      const item = data[key];

      parsedData[key] = {
        ...item,
        id: key,
        mobileOrientation:
          item.mobileOrientation && [
            MobileOrientations.PORTRAIT,
            MobileOrientations.LANDSCAPE].includes(
              item.mobileOrientation,
            )
            ? (item.mobileOrientation as MobileOrientation)
            : undefined,
      };
    }

    return parsedData;
  }

  /**
   * Initializes the ProjectData class by parsing raw JSON and organizing projects.
   */
  static initialize(): void {
    this._projects = this.parsePortfolioData(typedUnprocessedProjects);

    for (const key of this.keys) {
      const project = this._projects[key];
      if (project.active) {
        this._activeKeys.push(key);
        this._activeProjects.push(project);
        this.activeProjectsMap[key] = project;

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
