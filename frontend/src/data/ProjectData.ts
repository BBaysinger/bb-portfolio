import json from "data/portfolioProjects.json";

export type MobileOrientation = "portrait" | "landscape";

// Interface for individual portfolio projects
export interface PortfolioProjectBase {
  id: string;
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
  // Allow both string and string[] as values. TODO: This should only be arrays of strings.
  urls: Record<string, string | string[]>;
}

// Type for the overall portfolio data structure
export type PortfolioProjectData = Record<string, PortfolioProjectBase>;

/**
 * A helper for access of portfolio project JSON data, and help with
 * ordering and next/prev navigation.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class ProjectData {
  private static _projects: PortfolioProjectData;
  private static _activeProjects: Array<PortfolioProjectBase> = [];
  private static _activeKeys: Array<string> = [];
  private static _listedKeys: Array<string> = [];
  private static _listedProjects: Array<PortfolioProjectBase> = [];
  private static keys: Array<string> = Object.keys(json);
  private static activeProjectsMap: { [key: string]: PortfolioProjectBase } =
    {};
  private static activeIndex: number = 0;

  static get activeKeys() {
    return pd._activeKeys.concat();
  }

  static get listedKeys() {
    return pd._listedKeys.concat();
  }

  // TODO: Consider deep clone.
  static get listedProjects() {
    return pd._listedProjects.concat();
  }

  // TODO: Consider deep clone.
  static get activeProjects() {
    return pd._activeProjects.concat();
  }

  // TODO: Consider deep clone.
  static get activeProjectsRecord() {
    return pd._activeProjects.reduce(
      (record, project) => {
        record[project.id] = project;
        return record;
      },
      {} as Record<string, PortfolioProjectBase>,
    );
  }

  private static parsePortfolioData = (
    data: Record<string, any>,
  ): Record<string, PortfolioProjectBase> => {
    const parsedData: Record<string, PortfolioProjectBase> = {};

    for (const key in data) {
      const item = data[key];

      parsedData[key] = {
        id: key,
        title: item.title,
        active: item.active,
        omitFromList: item.omitFromList,
        clientId: item.clientId,
        mobileOrientation:
          item.mobileOrientation === "portrait" ||
          item.mobileOrientation === "landscape"
            ? item.mobileOrientation
            : undefined, // Ensure it matches MobileOrientation or set as undefined
        tags: item.tags,
        role: item.role,
        year: item.year || undefined,
        awards: item.awards || undefined,
        type: item.type || undefined,
        isGame: item.isGame,
        mobileCompatible: item.mobileCompatible,
        desc: item.desc,
        urls: item.urls,
      };
    }

    return parsedData;
  };

  static initialize = () => {
    pd._projects = pd.parsePortfolioData(json);

    pd.keys.forEach((key: string) => {
      if (pd._projects[key].active) {
        if (pd._projects[key].omitFromList !== true) {
          pd._listedProjects.push(pd._projects[key]);
          pd._listedKeys.push(key);
        }
        pd._activeKeys[pd.activeIndex] = key;
        pd._activeProjects[pd.activeIndex] = pd._projects[key];
        pd.activeProjectsMap[key] = pd._projects[key];
        pd.activeIndex++;
      }
    });
  };

  static projectIndex = (key: string): number => {
    return pd._activeKeys.indexOf(key);
  };

  static prevKey = (key: string): string => {
    let retVal;
    const pI = pd.projectIndex(key);

    if (pI > 0) {
      retVal = pd._activeKeys[pI - 1];
    } else {
      retVal = pd._activeKeys[pd._activeKeys.length - 1];
    }

    return retVal;
  };

  static nextKey = (key: string): string => {
    let retVal;
    const pI = pd.projectIndex(key);

    if (pI < pd.activeKeys.length - 1) {
      retVal = pd.activeKeys[pI + 1];
    } else {
      retVal = pd.activeKeys[0];
    }

    return retVal;
  };
}

const pd = ProjectData;

pd.initialize();
