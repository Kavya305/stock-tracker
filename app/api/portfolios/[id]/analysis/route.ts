import { NextResponse } from "next/server";
import { dbGet, dbAll, profileIdFrom } from "@/lib/db";
import { getPortfolioSummary, Txn } from "@/lib/portfolio";
import { getStocks } from "@/lib/quotes";
import { analysePortfolio } from "@/lib/analysis";
import { buildSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profileId = profileIdFrom(req);
  const owns = await dbGet(
    "SELECT 1 AS x FROM portfolios WHERE id=? AND profile_id=?",
    [Number(id), profileId]
  );
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const summary = await getPortfolioSummary(Number(id));
  if (!summary) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const txns = await dbAll<Txn>(
    "SELECT * FROM transactions WHERE portfolio_id=? ORDER BY date, id",
    [Number(id)]
  );
  if (txns.length === 0) {
    return NextResponse.json({
      empty: true,
      periods: [],
      breakdown: {},
      suggestions: { reduce: [], add: [] },
    });
  }

  const heldSymbols = [...new Set(txns.map((t) => t.symbol))];

  // Candidate pool for "add" ideas = stocks in this profile's watchlists.
  const wl = await dbAll<{ symbol: string }>(
    `SELECT DISTINCT ws.symbol FROM watchlist_stocks ws
       JOIN watchlists w ON w.id = ws.watchlist_id
      WHERE w.profile_id = ?`,
    [profileId]
  );
  const watchSymbols = wl.map((r) => r.symbol);

  const [stocks, watchlistStocks] = await Promise.all([
    getStocks(heldSymbols),
    watchSymbols.length ? getStocks(watchSymbols) : Promise.resolve([]),
  ]);

  const analysis = await analysePortfolio(txns, stocks);
  const suggestions = buildSuggestions({
    holdings: summary.holdings,
    oneYear: analysis.breakdown["1Y"] ?? [],
    watchlistStocks,
    totalValue: summary.totalCurrent,
  });

  return NextResponse.json({
    empty: false,
    periods: analysis.periods,
    breakdown: analysis.breakdown,
    firstTxnDate: analysis.firstTxnDate,
    suggestions,
    watchlistCount: watchSymbols.length,
  });
}
