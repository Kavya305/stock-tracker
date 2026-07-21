import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const BENCHMARK = "^NSEI"; // Nifty 50
export const BENCHMARK_NAME = "Nifty 50";

export interface PricePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

const cache = new Map<string, { at: number; points: PricePoint[] }>();
const TTL = 6 * 60 * 60 * 1000; // 6h — daily bars only change once a day

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchOne(symbol: string, years: number): Promise<PricePoint[]> {
  const key = `${symbol}:${years}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.points;

  const start = new Date();
  start.setFullYear(start.getFullYear() - years);
  let points: PricePoint[] = [];
  try {
    const res = await yahooFinance.chart(symbol, {
      period1: start,
      period2: new Date(),
      interval: "1d",
    });
    points = res.quotes
      .filter((q) => q.close != null && q.date != null)
      .map((q) => ({ date: iso(new Date(q.date as unknown as string)), close: q.close as number }));
  } catch {
    points = [];
  }
  cache.set(key, { at: Date.now(), points });
  return points;
}

/** Daily closes for each symbol, keyed by symbol. Missing symbols map to []. */
export async function getHistory(
  symbols: string[],
  years = 3
): Promise<Map<string, PricePoint[]>> {
  const out = new Map<string, PricePoint[]>();
  const POOL = 6;
  for (let i = 0; i < symbols.length; i += POOL) {
    const batch = symbols.slice(i, i + POOL);
    const res = await Promise.all(batch.map((s) => fetchOne(s, years)));
    batch.forEach((s, j) => out.set(s, res[j]));
  }
  return out;
}

export async function getBenchmark(years = 3): Promise<PricePoint[]> {
  return fetchOne(BENCHMARK, years);
}

/** Turn a series into a date->close lookup for fast access. */
export function toMap(points: PricePoint[]): Map<string, number> {
  return new Map(points.map((p) => [p.date, p.close]));
}
