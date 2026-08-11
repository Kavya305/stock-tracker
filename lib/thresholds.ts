import { dbAll, dbRun } from "./db";
import { getStocks } from "./quotes";

export interface ThresholdRow {
  id: number;
  symbol: string;
  buy_below: number | null;
  sell_above: number | null;
  note: string | null;
}

export interface ThresholdStatus {
  id: number;
  symbol: string;
  name: string;
  price: number | null;
  buyBelow: number | null;
  sellAbove: number | null;
  note: string | null;
  buyTriggered: boolean;
  sellTriggered: boolean;
  // Signed % gap to the nearest relevant target. Negative = already past it.
  buyGapPct: number | null; // how far price must fall to hit buy target
  sellGapPct: number | null; // how far price must rise to hit sell target
}

export async function listThresholds(profileId: number): Promise<ThresholdStatus[]> {
  const rows = await dbAll<ThresholdRow>(
    `SELECT id, symbol, buy_below, sell_above, note
       FROM thresholds WHERE profile_id=? ORDER BY id DESC`,
    [profileId]
  );
  if (rows.length === 0) return [];

  const symbols = [...new Set(rows.map((r) => r.symbol))];
  const stocks = await getStocks(symbols);
  const priceBy = new Map(stocks.map((s) => [s.symbol, s]));

  return rows.map((r) => {
    const st = priceBy.get(r.symbol);
    const price = st?.price ?? null;
    const buyBelow = r.buy_below;
    const sellAbove = r.sell_above;
    return {
      id: r.id,
      symbol: r.symbol,
      name: st?.name ?? r.symbol.replace(".NS", ""),
      price,
      buyBelow,
      sellAbove,
      note: r.note,
      buyTriggered: buyBelow != null && price != null && price <= buyBelow,
      sellTriggered: sellAbove != null && price != null && price >= sellAbove,
      buyGapPct:
        buyBelow != null && price != null && price > 0
          ? (buyBelow - price) / price
          : null,
      sellGapPct:
        sellAbove != null && price != null && price > 0
          ? (sellAbove - price) / price
          : null,
    };
  });
}

export async function countTriggered(profileId: number): Promise<number> {
  const list = await listThresholds(profileId);
  return list.filter((t) => t.buyTriggered || t.sellTriggered).length;
}

export async function upsertThreshold(
  profileId: number,
  input: {
    symbol: string;
    buyBelow: number | null;
    sellAbove: number | null;
    note: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const symbol = input.symbol?.trim();
  if (!symbol) return { ok: false, error: "Stock required" };
  const buy = input.buyBelow;
  const sell = input.sellAbove;
  if ((buy == null || !(buy > 0)) && (sell == null || !(sell > 0)))
    return { ok: false, error: "Set a buy price, a sell price, or both" };
  if (buy != null && sell != null && buy >= sell)
    return {
      ok: false,
      error: "Buy-below price should be lower than the sell-above price",
    };

  await dbRun(
    `INSERT INTO thresholds (profile_id, symbol, buy_below, sell_above, note, created_at)
       VALUES (?,?,?,?,?,?)
     ON CONFLICT (profile_id, symbol)
       DO UPDATE SET buy_below=excluded.buy_below,
                     sell_above=excluded.sell_above,
                     note=excluded.note`,
    [
      profileId,
      symbol,
      buy != null && buy > 0 ? buy : null,
      sell != null && sell > 0 ? sell : null,
      input.note?.trim() || null,
      new Date().toISOString(),
    ]
  );
  return { ok: true };
}

export async function deleteThreshold(profileId: number, id: number): Promise<void> {
  await dbRun("DELETE FROM thresholds WHERE id=? AND profile_id=?", [id, profileId]);
}
