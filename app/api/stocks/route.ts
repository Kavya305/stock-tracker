import { NextResponse } from "next/server";
import { getStocks } from "@/lib/quotes";
import { INDICES, IndexName, symbolsForIndex } from "@/lib/universe";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const param = new URL(req.url).searchParams.get("index");
  const index = (INDICES.includes(param as IndexName)
    ? param
    : "Nifty 50") as IndexName;
  const stocks = await getStocks(symbolsForIndex(index));
  return NextResponse.json(stocks);
}
