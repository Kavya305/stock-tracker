import { NextResponse } from "next/server";
import { dbGet, dbAll, dbBatch, profileIdFrom } from "@/lib/db";
import { getPortfolioSummary } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

async function owns(id: number, profileId: number): Promise<boolean> {
  return !!(await dbGet(
    "SELECT 1 AS x FROM portfolios WHERE id=? AND profile_id=?",
    [id, profileId]
  ));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await owns(Number(id), profileIdFrom(req))))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const summary = await getPortfolioSummary(Number(id));
  if (!summary) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const txns = await dbAll(
    "SELECT * FROM transactions WHERE portfolio_id=? ORDER BY date DESC, id DESC",
    [Number(id)]
  );
  return NextResponse.json({ ...summary, transactions: txns });
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
    { sql: "DELETE FROM transactions WHERE portfolio_id=?", args: [Number(id)] },
    {
      sql: "DELETE FROM portfolios WHERE id=? AND profile_id=?",
      args: [Number(id), profileId],
    },
  ]);
  return NextResponse.json({ ok: true });
}
