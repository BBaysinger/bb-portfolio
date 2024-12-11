// Interface for individual portfolio pieces
export interface PortfolioPieceBase {
  title: string;
  active: boolean;
  omitFromList: boolean;
  clientId: string;
  mobileOrientation?: string;
  tags: string;
  role: string;
  year?: string;
  awards?: string;
  type?: string;
  isGame: boolean;
  mobileCompatible: boolean;
  desc: string[];
  urls: Record<string, string | string[]>; // Allow both string and string[] as values
}

// Type for the overall portfolio data structure
export type PortfolioData = Record<string, PortfolioPieceBase>;
