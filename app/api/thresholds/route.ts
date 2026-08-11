import { NextResponse } from "next/server";
import { profileIdFrom } from "@/lib/db";
import {
  listThresholds,
  upsertThreshold,
  deleteThreshold,
} from "@/lib/thresholds";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json(await listThresholds(profileIdFrom(req)));
}

export async function POST(req: Request) {
  const body = await req.json();
  const res = await upsertThreshold(profileIdFrom(req), {
    symbol: String(body.symbol ?? ""),
    buyBelow: body.buyBelow != null && body.buyBelow !== "" ? Number(body.buyBelow) : null,
    sellAbove: body.sellAbove != null && body.sellAbove !== "" ? Number(body.sellAbove) : null,
    note: body.note ?? null,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await deleteThreshold(profileIdFrom(req), Number(id));
  return NextResponse.json({ ok: true });
}
