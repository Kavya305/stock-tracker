import { NextResponse } from "next/server";
import { dbGet, dbAll, profileIdFrom } from "@/lib/db";
import { getResults, getNews } from "@/lib/results";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owns = await dbGet(
    "SELECT 1 AS x FROM portfolios WHERE id=? AND profile_id=?",
    [Number(id), profileIdFrom(req)]
  );
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only companies currently held (net units > 0).
  const rows = await dbAll<{ symbol: string; units: number }>(
    `SELECT symbol,
            SUM(CASE WHEN type='BUY' THEN units ELSE -units END) AS units
       FROM transactions WHERE portfolio_id=? GROUP BY symbol`,
    [Number(id)]
  );
  const symbols = rows.filter((r) => Number(r.units) > 1e-9).map((r) => r.symbol);
  if (symbols.length === 0)
    return NextResponse.json({ results: [], news: [] });

  const [results, news] = await Promise.all([
    getResults(symbols),
    getNews(symbols),
  ]);
  return NextResponse.json({ results, news });
}
