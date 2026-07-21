import { NextResponse } from "next/server";
import { dbGet, dbRun, profileIdFrom } from "@/lib/db";

export const dynamic = "force-dynamic";

async function owns(portfolioId: number, profileId: number): Promise<boolean> {
  return !!(await dbGet(
    "SELECT 1 AS x FROM portfolios WHERE id=? AND profile_id=?",
    [portfolioId, profileId]
  ));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await owns(Number(id), profileIdFrom(req))))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { symbol, type, date, units, price } = await req.json();
  if (!symbol || !["BUY", "SELL"].includes(type) || !date || !(units > 0) || !(price > 0))
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  const info = await dbRun(
    "INSERT INTO transactions (portfolio_id, symbol, type, date, units, price) VALUES (?,?,?,?,?,?)",
    [Number(id), symbol, type, date, units, price]
  );
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await owns(Number(id), profileIdFrom(req))))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { txnId, symbol, type, date, units, price } = await req.json();
  if (!txnId || !symbol || !["BUY", "SELL"].includes(type) || !date || !(units > 0) || !(price > 0))
    return NextResponse.json({ error: "Invalid transaction" }, { status: 400 });
  const res = await dbRun(
    `UPDATE transactions SET symbol=?, type=?, date=?, units=?, price=?
      WHERE id=? AND portfolio_id=?`,
    [symbol, type, date, units, price, Number(txnId), Number(id)]
  );
  if (res.rowsAffected === 0)
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await owns(Number(id), profileIdFrom(req))))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { txnId } = await req.json();
  await dbRun("DELETE FROM transactions WHERE id=? AND portfolio_id=?", [
    Number(txnId),
    Number(id),
  ]);
  return NextResponse.json({ ok: true });
}
