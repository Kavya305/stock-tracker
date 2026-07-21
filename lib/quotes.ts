import YahooFinance from "yahoo-finance2";
import { UNIVERSE, bySymbol, IndexName } from "./universe";
import { getCustomMap } from "./custom";

// Stocks the user added themselves sit outside the NSE index universe.
export type StockIndex = IndexName | "Custom";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface StockData {
  symbol: string;
  name: string;
  sector: string;
  index: StockIndex;
  price: number | null;
  peg: number | null;
  pe: number | null;
  fiveYrAvgPe: number | null; // approximated: 5y avg price / current trailing EPS
  roe: number | null; // %
  roce: number | null; // % (approximated as EBITDA / total assets when available)
  marketCap: number | null; // in INR
  capCategory: "Large" | "Mid" | "Small" | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  rating: number | null; // 0-10
  signal: "BUY" | "SELL" | "HOLD" | null;
}

// SEBI-style thresholds (approx, INR): Large > 84k cr, Mid > 28k cr
const CRORE = 1e7;
function capCategory(mc: number | null): StockData["capCategory"] {
  if (mc == null) return null;
  if (mc >= 84000 * CRORE) return "Large";
  if (mc >= 28000 * CRORE) return "Mid";
  return "Small";
}

function computeRating(s: Omit<StockData, "rating" | "signal">): number | null {
  if (s.pe == null && s.roe == null) return null;
  let score = 5;
  if (s.roe != null) {
    if (s.roe > 20) score += 2;
    else if (s.roe > 12) score += 1;
    else if (s.roe < 8) score -= 2;
  }
  if (s.peg != null) {
    if (s.peg > 0 && s.peg < 1) score += 2;
    else if (s.peg < 2) score += 1;
    else if (s.peg > 3 || s.peg < 0) score -= 1;
  }
  if (s.pe != null && s.fiveYrAvgPe != null && s.fiveYrAvgPe > 0) {
    const rel = s.pe / s.fiveYrAvgPe;
    if (rel < 0.85) score += 1;
    else if (rel > 1.25) score -= 1;
  }
  return Math.max(0, Math.min(10, score));
}

function computeSignal(s: Omit<StockData, "signal">): StockData["signal"] {
  if (s.rating == null || s.price == null) return null;
  const nearLow =
    s.fiftyTwoWeekLow != null && s.price <= s.fiftyTwoWeekLow * 1.15;
  const nearHigh =
    s.fiftyTwoWeekHigh != null && s.price >= s.fiftyTwoWeekHigh * 0.97;
  if (s.rating >= 7 && nearLow) return "BUY";
  if (s.rating <= 3 && nearHigh) return "SELL";
  if (s.rating >= 8) return "BUY";
  if (s.rating <= 2) return "SELL";
  return "HOLD";
}

interface CacheEntry {
  data: StockData;
  at: number;
}
const cache = new Map<string, CacheEntry>();
const QUOTE_TTL = 5 * 60 * 1000; // price refresh
const FUND_TTL = 12 * 60 * 60 * 1000; // fundamentals refresh
const fundCache = new Map<
  string,
  { at: number; peg: number | null; roe: number | null; roce: number | null; fiveYrAvgPe: number | null }
>();

async function fetchFundamentals(symbol: string) {
  const hit = fundCache.get(symbol);
  if (hit && Date.now() - hit.at < FUND_TTL) return hit;
  let peg: number | null = null,
    roe: number | null = null,
    roce: number | null = null,
    fiveYrAvgPe: number | null = null;
  try {
    const qs = await yahooFinance.quoteSummary(symbol, {
      modules: ["defaultKeyStatistics", "financialData", "summaryDetail"],
    });
    peg = qs.defaultKeyStatistics?.pegRatio ?? null;
    roe =
      qs.financialData?.returnOnEquity != null
        ? qs.financialData.returnOnEquity * 100
        : null;
    // ROCE approximation: EBITDA / (marketCap-implied) not available; use
    // returnOnAssets * 1.5 heuristic only when nothing better exists.
    roce =
      qs.financialData?.returnOnAssets != null
        ? qs.financialData.returnOnAssets * 100 * 1.5
        : null;
    const trailingEps = qs.defaultKeyStatistics?.trailingEps ?? null;
    if (trailingEps && trailingEps > 0) {
      try {
        const now = new Date();
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 5);
        const hist = await yahooFinance.chart(symbol, {
          period1: start,
          period2: now,
          interval: "1mo",
        });
        const closes = hist.quotes
          .map((q) => q.close)
          .filter((c): c is number => c != null);
        if (closes.length > 12) {
          const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;
          fiveYrAvgPe = avgPrice / trailingEps;
        }
      } catch {}
    }
  } catch {}
  const entry = { at: Date.now(), peg, roe, roce, fiveYrAvgPe };
  fundCache.set(symbol, entry);
  return entry;
}

export async function getStocks(symbols?: string[]): Promise<StockData[]> {
  const list = symbols ?? UNIVERSE.map((s) => s.symbol);
  const custom = await getCustomMap();
  const fresh = list.filter((s) => {
    const hit = cache.get(s);
    return !hit || Date.now() - hit.at > QUOTE_TTL;
  });

  if (fresh.length > 0) {
    // Batch quotes in chunks so large indices don't overload a single request.
    type Q = Awaited<ReturnType<typeof yahooFinance.quote>>;
    const quotes: Q[] = [];
    const CHUNK = 50;
    for (let i = 0; i < fresh.length; i += CHUNK) {
      try {
        const res = await yahooFinance.quote(fresh.slice(i, i + CHUNK));
        quotes.push(...(Array.isArray(res) ? res : [res]));
      } catch {}
    }
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // fundamentals with limited concurrency
    const POOL = 8;
    for (let i = 0; i < fresh.length; i += POOL) {
      const batch = fresh.slice(i, i + POOL);
      const funds = await Promise.all(batch.map((s) => fetchFundamentals(s)));
      batch.forEach((symbol, j) => {
        const q = quoteMap.get(symbol);
        const meta = bySymbol.get(symbol);
        const own = custom.get(symbol);
        const f = funds[j];
        const base = {
          symbol,
          name: meta?.name ?? own?.name ?? q?.shortName ?? symbol,
          sector: meta?.sector ?? own?.sector ?? "Other",
          index: (meta?.index ?? "Custom") as StockIndex,
          price: q?.regularMarketPrice ?? null,
          pe: q?.trailingPE ?? null,
          peg: f.peg,
          roe: f.roe,
          roce: f.roce,
          fiveYrAvgPe: f.fiveYrAvgPe,
          marketCap: q?.marketCap ?? null,
          capCategory: capCategory(q?.marketCap ?? null),
          fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: q?.fiftyTwoWeekLow ?? null,
        };
        const rating = computeRating(base);
        const signal = computeSignal({ ...base, rating });
        cache.set(symbol, { at: Date.now(), data: { ...base, rating, signal } });
      });
    }
  }

  return list
    .map((s) => cache.get(s)?.data)
    .filter((d): d is StockData => d != null);
}
