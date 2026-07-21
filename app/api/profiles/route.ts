import { NextResponse } from "next/server";
import { dbAll, dbRun } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const profiles = await dbAll("SELECT * FROM profiles ORDER BY id");
  return NextResponse.json(profiles);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name?.trim())
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const info = await dbRun("INSERT INTO profiles (name) VALUES (?)", [
      name.trim(),
    ]);
    return NextResponse.json({ id: info.lastInsertRowid, name: name.trim() });
  } catch {
    return NextResponse.json({ error: "Name already exists" }, { status: 409 });
  }
}
