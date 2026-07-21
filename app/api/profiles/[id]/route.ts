import { NextResponse } from "next/server";
import { dbBatch } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pid = Number(id);
  if (pid === 1)
    return NextResponse.json(
      { error: "The Default profile cannot be deleted." },
      { status: 400 }
    );
  // Manual cascade: remove this profile's watchlists/portfolios and children.
  await dbBatch([
    {
      sql: `DELETE FROM watchlist_stocks WHERE watchlist_id IN
              (SELECT id FROM watchlists WHERE profile_id=?)`,
      args: [pid],
    },
    { sql: "DELETE FROM watchlists WHERE profile_id=?", args: [pid] },
    {
      sql: `DELETE FROM transactions WHERE portfolio_id IN
              (SELECT id FROM portfolios WHERE profile_id=?)`,
      args: [pid],
    },
    { sql: "DELETE FROM portfolios WHERE profile_id=?", args: [pid] },
    { sql: "DELETE FROM profiles WHERE id=?", args: [pid] },
  ]);
  return NextResponse.json({ ok: true });
}
