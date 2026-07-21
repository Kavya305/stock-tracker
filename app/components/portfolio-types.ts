export interface Holding {
  symbol: string;
  name: string;
  sector: string;
  capCategory: "Large" | "Mid" | "Small" | null;
  balanceUnits: number;
  invested: number;
  currentValue: number | null;
  currentPrice: number | null;
  firstBuy: string;
  lastSell: string | null;
  rating: number | null;
  signal: "BUY" | "SELL" | "HOLD" | null;
  xirr: number | null;
}

export interface Txn {
  id: number;
  symbol: string;
  type: "BUY" | "SELL";
  date: string;
  units: number;
  price: number;
}

export interface PeriodPerformance {
  label: string;
  months: number;
  startDate: string;
  endDate: string;
  startValue: number;
  endValue: number;
  netInvested: number;
  gain: number;
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  benchmarkName: string;
  sinceInception: boolean;
}

export interface HoldingPeriod {
  symbol: string;
  name: string;
  sector: string;
  priceReturn: number | null;
  vsBenchmark: number | null;
  contribution: number;
  weight: number;
  held: boolean;
}

export interface Suggestion {
  symbol: string;
  name: string;
  sector: string;
  kind: "reduce" | "add";
  strength: "strong" | "moderate";
  reasons: string[];
}

export interface AnalysisResponse {
  empty: boolean;
  periods: PeriodPerformance[];
  breakdown: Record<string, HoldingPeriod[]>;
  firstTxnDate?: string | null;
  suggestions: { reduce: Suggestion[]; add: Suggestion[] };
  watchlistCount?: number;
}

export interface QuarterResultRow {
  period: string; // Indian fiscal quarter, e.g. "Q1 FY27"
  calendarPeriod?: string;
  periodEndDate: string | null;
  reportedDate: string | null;
  epsActual: number | null;
  epsEstimate: number | null;
  surprisePct: number | null;
  revenue: number | null;
  earnings: number | null;
  profitMargin: number | null;
}

export interface CompanyResults {
  symbol: string;
  name: string;
  quarters: QuarterResultRow[];
  nextEarningsDate: string | null;
  available: boolean;
}

export interface NewsItem {
  symbol: string;
  company: string;
  title: string;
  publisher: string;
  link: string;
  published: string | null;
}

export interface QuarterInfo {
  year: number;
  q: number;
  label: string;
  start: string;
  end: string;
}

export interface QuarterContribution {
  symbol: string;
  name: string;
  sector: string;
  contribution: number;
  priceReturn: number | null;
}

export interface SectorWeight {
  sector: string;
  startWeight: number;
  endWeight: number;
  drift: number;
}

export interface QuarterReport {
  quarter: QuarterInfo;
  startValue: number;
  endValue: number;
  netInvested: number;
  gain: number;
  portfolioReturn: number | null;
  benchmarkReturn: number | null;
  benchmarkName: string;
  contributors: QuarterContribution[];
  detractors: QuarterContribution[];
  allocation: SectorWeight[];
  results: CompanyResults[];
  isPartial: boolean;
}

export interface PortfolioDetail {
  id: number;
  name: string;
  holdings: Holding[];
  transactions: Txn[];
  totalInvested: number;
  totalCurrent: number;
  xirr: number | null;
}
