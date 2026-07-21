import YahooFinance from "yahoo-finance2";
import { bySymbol } from "./universe";
import { fiscalLabelFromPeriodEnd } from "./fiscal";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface QuarterResult {
  period: string; // Indian fiscal quarter, e.g. "Q1 FY27"
  calendarPeriod: string; // what Yahoo calls it, e.g. "2Q2026"
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
  quarters: QuarterResult[]; // newest first
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

const rCache = new Map<string, { at: number; data: CompanyResults }>();
const nCache = new Map<string, { at: number; data: NewsItem[] }>();
const TTL = 6 * 60 * 60 * 1000;

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(String(d));
  return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && isFinite(n) ? n : null;
};

async function fetchResults(symbol: string): Promise<CompanyResults> {
  const hit = rCache.get(symbol);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const name = bySymbol.get(symbol)?.name ?? symbol;
  let quarters: QuarterResult[] = [];
  let nextEarningsDate: string | null = null;

  try {
    const s = await yahooFinance.quoteSummary(symbol, {
      modules: ["earnings", "calendarEvents"],
    });
    const eps = s.earnings?.earningsChart?.quarterly ?? [];
    const fin = s.earnings?.financialsChart?.quarterly ?? [];
    const finBy = new Map(fin.map((f) => [String(f.date), f]));

    quarters = eps.map((q) => {
      const f = finBy.get(String(q.date));
      const rec = q as unknown as Record<string, unknown>;
      const periodEndDate = iso(rec.periodEndDate);
      return {
        // Yahoo's label is the calendar quarter; Indian companies report on an
        // Apr–Mar fiscal year, so show the fiscal quarter investors expect.
        period:
          fiscalLabelFromPeriodEnd(periodEndDate) ?? String(q.date),
        calendarPeriod: String(q.date),
        periodEndDate,
        reportedDate: iso(rec.reportedDate),
        epsActual: num(q.actual),
        epsEstimate: num(q.estimate),
        surprisePct: num(rec.surprisePct),
        revenue: f ? num(f.revenue) : null,
        earnings: f ? num(f.earnings) : null,
        profitMargin: f ? num((f as unknown as Record<string, unknown>).profitMargin) : null,
      };
    });
    // newest first
    quarters.reverse();
    const next = s.calendarEvents?.earnings?.earningsDate?.[0];
    nextEarningsDate = iso(next);
  } catch {
    quarters = [];
  }

  const data: CompanyResults = {
    symbol,
    name,
    quarters,
    nextEarningsDate,
    available: quarters.length > 0,
  };
  rCache.set(symbol, { at: Date.now(), data });
  return data;
}

async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const hit = nCache.get(symbol);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const company = bySymbol.get(symbol)?.name ?? symbol;
  let out: NewsItem[] = [];
  try {
    // Searching the company name gives far better relevance than the ticker.
    const res = await yahooFinance.search(company, {
      newsCount: 5,
      quotesCount: 0,
    });
    // Headlines often use the ticker ("TCS") rather than the full name, so
    // match on either the company's words or its ticker root.
    const words = company
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const ticker = symbol.replace(/\.NS$/, "").toLowerCase();
    const tickerRe = new RegExp(
      `\\b${ticker.replace(/[.*+?^${}()|[\]\\&-]/g, "\\$&")}\\b`,
      "i"
    );
    out = (res.news ?? [])
      .map((n) => {
        const rec = n as unknown as Record<string, unknown>;
        return {
          symbol,
          company,
          title: String(rec.title ?? ""),
          publisher: String(rec.publisher ?? ""),
          link: String(rec.link ?? ""),
          published: iso(rec.providerPublishTime),
        };
      })
      // Keep only stories that actually mention the company or its ticker.
      // For multi-word names require two matching words, so e.g. "HDFC Life"
      // stories don't get attached to "HDFC Bank".
      .filter((n) => {
        if (tickerRe.test(n.title)) return true;
        const t = n.title.toLowerCase();
        const hits = words.filter((w) => t.includes(w)).length;
        return hits >= Math.min(2, words.length);
      });
  } catch {
    out = [];
  }
  nCache.set(symbol, { at: Date.now(), data: out });
  return out;
}

async function pooled<T>(items: string[], fn: (s: string) => Promise<T>): Promise<T[]> {
  const out: T[] = [];
  const POOL = 5;
  for (let i = 0; i < items.length; i += POOL) {
    out.push(...(await Promise.all(items.slice(i, i + POOL).map(fn))));
  }
  return out;
}

export async function getResults(symbols: string[]): Promise<CompanyResults[]> {
  return pooled(symbols, fetchResults);
}

export async function getNews(symbols: string[]): Promise<NewsItem[]> {
  const lists = await pooled(symbols, fetchNews);
  return lists
    .flat()
    .sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
}
