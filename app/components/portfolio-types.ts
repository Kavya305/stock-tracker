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

export interface PortfolioDetail {
  id: number;
  name: string;
  holdings: Holding[];
  transactions: Txn[];
  totalInvested: number;
  totalCurrent: number;
  xirr: number | null;
}
