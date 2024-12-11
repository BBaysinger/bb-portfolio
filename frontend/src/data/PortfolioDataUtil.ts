import { PortfolioPieceBase, PortfolioData } from "data/portfolioTypes";
import json from "data/portfolio.json";

/**
 * A helper to expediate the use of portfolio data, and help with
 * ordering, and next/prev buttons.
 *
 * @author Bradley Baysinger
 * @since The beginning of time.
 * @version N/A
 */
export default class PortfolioDataUtil {
  static json: PortfolioData = json;
  static keys: Array<string> = Object.keys(json);
  static activeKeys: Array<string> = [];
  static activePieces: Array<PortfolioPieceBase> = [];
  static listedPieces: Array<PortfolioPieceBase> = [];
  static listedKeys: Array<string> = [];
  static activePiecesMap: { [key: string]: PortfolioPieceBase } = {};
  static activeIndex: number = 0;

  static initialize = () => {
    var pd = PortfolioDataUtil;
    pd.keys.forEach((key: string) => {
      if (pd.json[key].active) {
        if (pd.json[key].omitFromList !== true) {
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

  static pieceIndex = (key: string): number => {
    return PortfolioDataUtil.activeKeys.indexOf(key);
  };

  static prevKey = (key: string): string => {
    let retVal;
    const pI = PortfolioDataUtil.pieceIndex(key);

    if (pI > 0) {
      retVal = PortfolioDataUtil.activeKeys[pI - 1];
    } else {
      retVal =
        PortfolioDataUtil.activeKeys[PortfolioDataUtil.activeKeys.length - 1];
    }

    return retVal;
  };

  static nextKey = (key: string): string => {
    let retVal;
    const pI = PortfolioDataUtil.pieceIndex(key);

    if (pI < PortfolioDataUtil.activeKeys.length - 1) {
      retVal = PortfolioDataUtil.activeKeys[pI + 1];
    } else {
      retVal = PortfolioDataUtil.activeKeys[0];
    }

    return retVal;
  };
}

PortfolioDataUtil.initialize();
