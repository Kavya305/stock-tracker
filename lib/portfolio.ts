import { dbGet, dbAll } from "./db";
import { getStocks, StockData } from "./quotes";
import { xirr, CashFlow } from "./xirr";

export interface Txn {
  id: number;
  portfolio_id: number;
  symbol: string;
  type: "BUY" | "SELL";
  date: string;
  units: number;
  price: number;
}

export interface Holding {
  symbol: string;
  name: string;
  sector: string;
  capCategory: StockData["capCategory"];
  balanceUnits: number;
  invested: number; // cost of remaining units (avg-cost basis)
  currentValue: number | null;
  currentPrice: number | null;
  firstBuy: string;
  lastSell: string | null;
  rating: number | null;
  signal: StockData["signal"];
  xirr: number | null;
}

export interface PortfolioSummary {
  id: number;
  name: string;
  holdings: Holding[];
  totalInvested: number;
  totalCurrent: number;
  xirr: number | null;
}

export async function getPortfolioSummary(id: number): Promise<PortfolioSummary | null> {
  const p = await dbGet<{ id: number; name: string }>(
    "SELECT * FROM portfolios WHERE id=?",
    [id]
  );
  if (!p) return null;
  const txns = await dbAll<Txn>(
    "SELECT * FROM transactions WHERE portfolio_id=? ORDER BY date, id",
    [id]
  );

  const symbols = [...new Set(txns.map((t) => t.symbol))];
  const stocks = symbols.length > 0 ? await getStocks(symbols) : [];
  const stockMap = new Map(stocks.map((s) => [s.symbol, s]));

  const holdings: Holding[] = [];
  const allFlows: CashFlow[] = [];

  for (const symbol of symbols) {
    const st = stockMap.get(symbol);
    const mine = txns.filter((t) => t.symbol === symbol);
    let units = 0,
      cost = 0;
    const flows: CashFlow[] = [];
    let firstBuy = "",
      lastSell: string | null = null;
    for (const t of mine) {
      if (t.type === "BUY") {
        units += t.units;
        cost += t.units * t.price;
        if (!firstBuy) firstBuy = t.date;
        flows.push({ date: new Date(t.date), amount: -t.units * t.price });
      } else {
        // avg-cost reduction
        const avg = units > 0 ? cost / units : 0;
        units -= t.units;
        cost -= t.units * avg;
        lastSell = t.date;
        flows.push({ date: new Date(t.date), amount: t.units * t.price });
      }
    }
    const currentPrice = st?.price ?? null;
    const currentValue = currentPrice != null ? units * currentPrice : null;
    if (currentValue != null && units > 0.0000001) {
      flows.push({ date: new Date(), amount: currentValue });
    }
    allFlows.push(...flows);
    holdings.push({
      symbol,
      name: st?.name ?? symbol,
      sector: st?.sector ?? "Other",
      capCategory: st?.capCategory ?? null,
      balanceUnits: Math.round(units * 1e6) / 1e6,
      invested: Math.round(cost * 100) / 100,
      currentValue,
      currentPrice,
      firstBuy,
      lastSell,
      rating: st?.rating ?? null,
      signal: st?.signal ?? null,
      xirr: xirr(flows),
    });
  }

  const totalInvested = holdings.reduce((a, h) => a + h.invested, 0);
  const totalCurrent = holdings.reduce((a, h) => a + (h.currentValue ?? 0), 0);
  return {
    id: p.id,
    name: p.name,
    holdings,
    totalInvested,
    totalCurrent,
    xirr: xirr(allFlows),
  };
}
