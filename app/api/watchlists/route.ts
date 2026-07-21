import { NextResponse } from "next/server";
import { dbAll, dbRun, profileIdFrom } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const profileId = profileIdFrom(req);
  const lists = await dbAll<{ id: number; name: string }>(
    "SELECT * FROM watchlists WHERE profile_id=? ORDER BY name",
    [profileId]
  );
  const out = await Promise.all(
    lists.map(async (l) => ({
      ...l,
      symbols: (
        await dbAll<{ symbol: string }>(
          "SELECT symbol FROM watchlist_stocks WHERE watchlist_id=?",
          [l.id]
        )
      ).map((r) => r.symbol),
    }))
  );
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const info = await dbRun(
      "INSERT INTO watchlists (profile_id, name) VALUES (?,?)",
      [profileIdFrom(req), name.trim()]
    );
    return NextResponse.json({ id: info.lastInsertRowid, name: name.trim() });
  } catch {
    return NextResponse.json(
      { error: "A watchlist with that name already exists in this profile" },
      { status: 409 }
    );
  }
}
