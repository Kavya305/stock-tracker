import { NextResponse } from "next/server";
import { listCustom, addCustomStock, removeCustomStock } from "@/lib/custom";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listCustom());
}

export async function POST(req: Request) {
  const { symbol } = await req.json();
  const res = await addCustomStock(String(symbol ?? ""));
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res.stock);
}

export async function DELETE(req: Request) {
  const { symbol } = await req.json();
  await removeCustomStock(String(symbol ?? ""));
  return NextResponse.json({ ok: true });
}
