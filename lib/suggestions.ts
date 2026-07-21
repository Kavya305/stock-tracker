import { Holding } from "./portfolio";
import { StockData } from "./quotes";
import { HoldingPeriod } from "./analysis";

export interface Suggestion {
  symbol: string;
  name: string;
  sector: string;
  kind: "reduce" | "add";
  strength: "strong" | "moderate";
  reasons: string[];
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/**
 * Rule-based review candidates. Every suggestion carries the reasons that
 * produced it — these are prompts to look closer, not instructions to trade.
 */
export function buildSuggestions(opts: {
  holdings: Holding[];
  oneYear: HoldingPeriod[];
  watchlistStocks: StockData[];
  totalValue: number;
}): { reduce: Suggestion[]; add: Suggestion[] } {
  const { holdings, oneYear, watchlistStocks, totalValue } = opts;
  const perf = new Map(oneYear.map((r) => [r.symbol, r]));
  const held = holdings.filter((h) => h.balanceUnits > 1e-9);
  const heldSymbols = new Set(held.map((h) => h.symbol));
  const heldSectors = new Set(held.map((h) => h.sector));

  // ---- Positions worth reviewing for trimming / exit ----
  const reduce: Suggestion[] = [];
  for (const h of held) {
    const reasons: string[] = [];
    if (h.rating != null && h.rating <= 3)
      reasons.push(`Low quality score (${h.rating}/10)`);
    if (h.signal === "SELL") reasons.push("Rule-based signal reads SELL");

    const p = perf.get(h.symbol);
    if (p?.vsBenchmark != null && p.vsBenchmark < -0.15)
      reasons.push(
        `Trailed the Nifty 50 by ${pct(Math.abs(p.vsBenchmark))} over 1 year`
      );

    const weight = totalValue > 0 ? (h.currentValue ?? 0) / totalValue : 0;
    if (weight > 0.25)
      reasons.push(
        `Large position — ${pct(weight)} of the portfolio (concentration risk)`
      );

    if (h.currentValue != null && h.invested > 0) {
      const pl = h.currentValue / h.invested - 1;
      if (pl < -0.25) reasons.push(`Down ${pct(Math.abs(pl))} on your cost`);
    }

    if (reasons.length === 0) continue;
    const strong =
      reasons.length >= 2 || (h.rating != null && h.rating <= 2);
    reduce.push({
      symbol: h.symbol,
      name: h.name,
      sector: h.sector,
      kind: "reduce",
      strength: strong ? "strong" : "moderate",
      reasons,
    });
  }

  // ---- Watchlist names worth reviewing for adding ----
  const add: Suggestion[] = [];
  for (const s of watchlistStocks) {
    if (heldSymbols.has(s.symbol)) continue; // already own it
    const reasons: string[] = [];
    if (s.rating != null && s.rating >= 7)
      reasons.push(`Strong quality score (${s.rating}/10)`);
    if (s.signal === "BUY") reasons.push("Rule-based signal reads BUY");
    if (s.pe != null && s.fiveYrAvgPe != null && s.fiveYrAvgPe > 0 && s.pe < s.fiveYrAvgPe * 0.9)
      reasons.push(
        `PE ${s.pe.toFixed(1)} is below its 5-year average of ${s.fiveYrAvgPe.toFixed(1)}`
      );
    if (s.roe != null && s.roe > 18)
      reasons.push(`High return on equity (${s.roe.toFixed(1)}%)`);
    if (!heldSectors.has(s.sector))
      reasons.push(`Adds a sector you don't currently hold (${s.sector})`);

    const strong = s.rating != null && s.rating >= 8 && s.signal === "BUY";
    if (!strong && reasons.length < 2) continue; // keep the list meaningful
    add.push({
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      kind: "add",
      strength: strong ? "strong" : "moderate",
      reasons,
    });
  }

  const rank = (x: Suggestion) => (x.strength === "strong" ? 0 : 1);
  reduce.sort((a, b) => rank(a) - rank(b) || b.reasons.length - a.reasons.length);
  add.sort((a, b) => rank(a) - rank(b) || b.reasons.length - a.reasons.length);
  return { reduce, add };
}
