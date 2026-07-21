import { NextResponse } from "next/server";
import { dbGet, dbAll, dbRun, dbBatch, profileIdFrom } from "@/lib/db";
import { getStocks } from "@/lib/quotes";

export const dynamic = "force-dynamic";

async function owns(id: number, profileId: number): Promise<boolean> {
  return !!(await dbGet(
    "SELECT 1 AS x FROM watchlists WHERE id=? AND profile_id=?",
    [id, profileId]
  ));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profileId = profileIdFrom(req);
  const wl = await dbGet(
    "SELECT * FROM watchlists WHERE id=? AND profile_id=?",
    [Number(id), profileId]
  );
  if (!wl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const symbols = (
    await dbAll<{ symbol: string }>(
      "SELECT symbol FROM watchlist_stocks WHERE watchlist_id=?",
      [Number(id)]
    )
  ).map((r) => r.symbol);
  const stocks = symbols.length ? await getStocks(symbols) : [];
  return NextResponse.json({ ...wl, stocks });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await owns(Number(id), profileIdFrom(req))))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { add, remove } = await req.json();
  if (add)
    await dbRun(
      "INSERT OR IGNORE INTO watchlist_stocks (watchlist_id, symbol) VALUES (?,?)",
      [Number(id), add]
    );
  if (remove)
    await dbRun(
      "DELETE FROM watchlist_stocks WHERE watchlist_id=? AND symbol=?",
      [Number(id), remove]
    );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profileId = profileIdFrom(req);
  if (!(await owns(Number(id), profileId)))
    return NextResponse.json({ ok: true });
  await dbBatch([
    { sql: "DELETE FROM watchlist_stocks WHERE watchlist_id=?", args: [Number(id)] },
    {
      sql: "DELETE FROM watchlists WHERE id=? AND profile_id=?",
      args: [Number(id), profileId],
    },
  ]);
  return NextResponse.json({ ok: true });
}
