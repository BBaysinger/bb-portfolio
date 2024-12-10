import json from "data/portfolio.json";

/**
 * A helper to expediate the use of portfolio data, and help with
 * ordering, and next/prev buttons.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class PortfolioData {
  static json: any = json;
  static keys: Array<string> = Object.keys(json);
  static activeKeys: Array<string> = [];
  static activePieces: Array<any> = [];
  static listedPieces: Array<any> = [];
  static listedKeys: Array<string> = [];
  static activePiecesMap: { [key: string]: any } = {};
  static activeIndex: number = 0;

  static initialize = (): any => {
    var pd = PortfolioData;
    pd.keys.forEach((key: string) => {
      if (pd.json[key].active === "1") {
        if (pd.json[key].omitFromList !== "1") {
          pd.listedPieces.push(pd.json[key]);
          pd.listedKeys.push(key);
        }
        pd.activeKeys[pd.activeIndex] = key;
        pd.activePieces[pd.activeIndex] = pd.json[key];
        pd.activePiecesMap[key] = pd.json[key];
        pd.activeIndex++;
      }
    });
  };

  static pieceIndex = (key: string) => {
    return PortfolioData.activeKeys.indexOf(key);
  };

  static prevKey = (key: string): string => {
    let retVal;
    const pI = PortfolioData.pieceIndex(key);

    if (pI > 0) {
      retVal = PortfolioData.activeKeys[pI - 1];
    } else {
      retVal = PortfolioData.activeKeys[PortfolioData.activeKeys.length - 1];
    }

    return retVal;
  };

  static nextKey = (key: string): string => {
    let retVal;
    const pI = PortfolioData.pieceIndex(key);

    if (pI < PortfolioData.activeKeys.length - 1) {
      retVal = PortfolioData.activeKeys[pI + 1];
    } else {
      retVal = PortfolioData.activeKeys[0];
    }

    return retVal;
  };
}

PortfolioData.initialize();
