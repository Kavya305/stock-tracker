import YahooFinance from "yahoo-finance2";
import { dbAll, dbRun } from "./db";
import { bySymbol } from "./universe";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface CustomStock {
  symbol: string;
  name: string;
  sector: string;
}

export interface SearchHit {
  symbol: string;
  name: string;
  exchange: string;
  inUniverse: boolean;
}

let cache: { at: number; map: Map<string, CustomStock> } | null = null;
const TTL = 30 * 1000;

/** Stocks the user added manually, keyed by symbol. */
export async function getCustomMap(): Promise<Map<string, CustomStock>> {
  if (cache && Date.now() - cache.at < TTL) return cache.map;
  const rows = await dbAll<CustomStock>(
    "SELECT symbol, name, sector FROM custom_stocks ORDER BY name"
  );
  const map = new Map(rows.map((r) => [r.symbol, r]));
  cache = { at: Date.now(), map };
  return map;
}

export async function listCustom(): Promise<CustomStock[]> {
  return [...(await getCustomMap()).values()];
}

function invalidate() {
  cache = null;
}

/** Search Yahoo for a tradable symbol. Indian listings are surfaced first. */
export async function searchSymbols(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await yahooFinance.search(q, { quotesCount: 15, newsCount: 0 });
    const hits: SearchHit[] = [];
    for (const item of res.quotes ?? []) {
      const rec = item as unknown as Record<string, unknown>;
      const symbol = String(rec.symbol ?? "");
      if (!symbol) continue;
      if (rec.quoteType && rec.quoteType !== "EQUITY") continue;
      hits.push({
        symbol,
        name: String(rec.shortname ?? rec.longname ?? symbol),
        exchange: String(rec.exchDisp ?? rec.exchange ?? ""),
        inUniverse: bySymbol.has(symbol),
      });
    }
    // Prefer NSE/BSE listings for an Indian portfolio.
    return hits.sort((a, b) => {
      const score = (s: SearchHit) =>
        s.symbol.endsWith(".NS") ? 0 : s.symbol.endsWith(".BO") ? 1 : 2;
      return score(a) - score(b);
    });
  } catch {
    return [];
  }
}

/**
 * Verify a symbol really trades before storing it, and pull its name/sector
 * so it displays properly alongside universe stocks.
 */
export async function addCustomStock(
  symbol: string
): Promise<{ ok: true; stock: CustomStock } | { ok: false; error: string }> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return { ok: false, error: "Symbol required" };
  if (bySymbol.has(sym))
    return { ok: false, error: "That stock is already in the main list" };

  let name = sym;
  let sector = "Other";
  try {
    const q = await yahooFinance.quote(sym);
    const quote = Array.isArray(q) ? q[0] : q;
    if (!quote || quote.regularMarketPrice == null)
      return { ok: false, error: `No price data found for "${sym}"` };
    name = quote.shortName ?? quote.longName ?? sym;
  } catch {
    return {
      ok: false,
      error: `"${sym}" isn't a valid symbol. NSE stocks end in .NS (e.g. SUZLON.NS), BSE in .BO`,
    };
  }

  // Sector is a bonus — don't fail the add if it's unavailable.
  try {
    const p = await yahooFinance.quoteSummary(sym, { modules: ["assetProfile"] });
    if (p.assetProfile?.sector) sector = p.assetProfile.sector;
  } catch {}

  await dbRun(
    "INSERT OR REPLACE INTO custom_stocks (symbol, name, sector, added_at) VALUES (?,?,?,?)",
    [sym, name, sector, new Date().toISOString()]
  );
  invalidate();
  return { ok: true, stock: { symbol: sym, name, sector } };
}

export async function removeCustomStock(symbol: string): Promise<void> {
  await dbRun("DELETE FROM custom_stocks WHERE symbol=?", [symbol]);
  invalidate();
}
