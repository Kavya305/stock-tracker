import { NextResponse } from "next/server";
import { dbAll, dbRun, profileIdFrom } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const lists = await dbAll(
    "SELECT * FROM portfolios WHERE profile_id=? ORDER BY name",
    [profileIdFrom(req)]
  );
  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const info = await dbRun(
      "INSERT INTO portfolios (profile_id, name) VALUES (?,?)",
      [profileIdFrom(req), name.trim()]
    );
    return NextResponse.json({ id: info.lastInsertRowid, name: name.trim() });
  } catch {
    return NextResponse.json(
      { error: "A portfolio with that name already exists in this profile" },
      { status: 409 }
    );
  }
}
