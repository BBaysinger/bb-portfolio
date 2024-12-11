// Interface for individual portfolio pieces
export interface PortfolioPieceBase {
  title: string;
  active: string;
  omitFromList: string;
  clientId: string;
  mobileOrientation?: string;
  tags: string;
  role: string;
  year?: string;
  awards?: string;
  type?: string;
  isGame: string;
  mobileAvailability?: string;
  desc: string[];
  urls: Record<string, string | string[]>; // Allow both string and string[] as values
}

// Type for the overall portfolio data structure
export type PortfolioData = Record<string, PortfolioPieceBase>;
