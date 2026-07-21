import { NextResponse } from "next/server";
import { dbGet, dbAll, profileIdFrom } from "@/lib/db";
import { Txn } from "@/lib/portfolio";
import { getStocks } from "@/lib/quotes";
import {
  buildQuarterReport,
  listQuarters,
  makeQuarter,
  currentQuarter,
} from "@/lib/quarterly";

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

  const txns = await dbAll<Txn>(
    "SELECT * FROM transactions WHERE portfolio_id=? ORDER BY date, id",
    [Number(id)]
  );
  if (txns.length === 0)
    return NextResponse.json({ empty: true, quarters: [], report: null });

  const firstTxnDate = txns[0].date;
  const quarters = listQuarters(firstTxnDate);

  const sp = new URL(req.url).searchParams;
  const y = Number(sp.get("year"));
  const q = Number(sp.get("q"));
  const chosen =
    Number.isFinite(y) && q >= 1 && q <= 4 ? makeQuarter(y, q) : (quarters[0] ?? currentQuarter());

  const stocks = await getStocks([...new Set(txns.map((t) => t.symbol))]);
  const report = await buildQuarterReport(txns, stocks, chosen);

  return NextResponse.json({ empty: false, quarters, report });
}
