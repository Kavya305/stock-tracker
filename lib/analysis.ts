import { Txn } from "./portfolio";
import { StockData } from "./quotes";
import {
  PricePoint,
  getHistory,
  getBenchmark,
  toMap,
  BENCHMARK_NAME,
} from "./history";

export interface DayPoint {
  date: string;
  value: number; // market value of holdings that day
  flow: number; // net external money added that day (buys +, sells -)
}

export interface PeriodPerformance {
  label: string; // "3M" | "1Y" | "3Y"
  months: number;
  startDate: string;
  endDate: string;
  startValue: number;
  endValue: number;
  netInvested: number; // money added during the window
  gain: number; // endValue - startValue - netInvested
  portfolioReturn: number | null; // time-weighted return (fraction)
  benchmarkReturn: number | null;
  benchmarkName: string;
  sinceInception: boolean; // portfolio younger than the window
}

export interface HoldingPeriod {
  symbol: string;
  name: string;
  sector: string;
  priceReturn: number | null; // stock's own price move over the window
  vsBenchmark: number | null;
  contribution: number; // rupee gain contributed over the window
  weight: number; // current weight in portfolio
  held: boolean;
}

export interface PortfolioAnalysis {
  periods: PeriodPerformance[];
  breakdown: Record<string, HoldingPeriod[]>; // keyed by period label
  series: DayPoint[];
  benchmarkSeries: PricePoint[];
  firstTxnDate: string | null;
}

const MONTHS: { label: string; months: number }[] = [
  { label: "3M", months: 3 },
  { label: "1Y", months: 12 },
  { label: "3Y", months: 36 },
];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return iso(d);
}

/** Rebuild what the portfolio was worth on every trading day. */
export function buildValueSeries(
  txns: Txn[],
  hist: Map<string, PricePoint[]>,
  axis: string[]
): DayPoint[] {
  const symbols = [...new Set(txns.map((t) => t.symbol))];
  const bySym = new Map(
    symbols.map((s) => [
      s,
      txns.filter((t) => t.symbol === s).sort((a, b) => a.date.localeCompare(b.date)),
    ])
  );
  const priceMaps = new Map(symbols.map((s) => [s, toMap(hist.get(s) ?? [])]));
  const ptr = new Map(symbols.map((s) => [s, 0]));
  const units = new Map(symbols.map((s) => [s, 0]));
  const lastClose = new Map<string, number>();

  const series: DayPoint[] = [];
  for (const date of axis) {
    let flow = 0;
    for (const s of symbols) {
      const list = bySym.get(s)!;
      let i = ptr.get(s)!;
      while (i < list.length && list[i].date <= date) {
        const t = list[i];
        if (t.type === "BUY") {
          units.set(s, units.get(s)! + t.units);
          flow += t.units * t.price;
        } else {
          units.set(s, units.get(s)! - t.units);
          flow -= t.units * t.price;
        }
        i++;
      }
      ptr.set(s, i);
      const c = priceMaps.get(s)!.get(date);
      if (c != null) lastClose.set(s, c);
    }
    let value = 0;
    for (const s of symbols) {
      const u = units.get(s)!;
      const c = lastClose.get(s);
      if (u > 1e-9 && c != null) value += u * c;
    }
    series.push({ date, value, flow });
  }
  return series;
}

/**
 * Time-weighted return: chain daily returns, removing the effect of money
 * added or withdrawn, so deposits aren't mistaken for gains.
 */
export function twr(series: DayPoint[], from: number, to: number): number | null {
  let acc = 1;
  let counted = false;
  for (let i = from + 1; i <= to; i++) {
    const prev = series[i - 1].value;
    if (prev <= 0) continue;
    const r = (series[i].value - series[i].flow) / prev;
    if (!isFinite(r) || r <= 0) continue;
    acc *= r;
    counted = true;
  }
  return counted ? acc - 1 : null;
}

export function indexOnOrAfter(axis: string[], date: string): number {
  const i = axis.findIndex((d) => d >= date);
  return i === -1 ? axis.length - 1 : i;
}

export function periodReturn(
  points: PricePoint[],
  startDate: string,
  endDate?: string
): number | null {
  const inRange = points.filter(
    (p) => p.date >= startDate && (!endDate || p.date <= endDate)
  );
  if (inRange.length < 2) return null;
  const a = inRange[0].close;
  const b = inRange[inRange.length - 1].close;
  return a > 0 ? b / a - 1 : null;
}

export async function analysePortfolio(
  txns: Txn[],
  stocks: StockData[]
): Promise<PortfolioAnalysis> {
  const symbols = [...new Set(txns.map((t) => t.symbol))];
  const [hist, bench] = await Promise.all([
    getHistory(symbols, 3),
    getBenchmark(3),
  ]);

  // Use the index's trading days as the calendar; fall back to stock dates.
  let axis = bench.map((p) => p.date);
  if (axis.length === 0) {
    axis = [
      ...new Set([...hist.values()].flatMap((pts) => pts.map((p) => p.date))),
    ].sort();
  }

  const series = buildValueSeries(txns, hist, axis);
  const firstTxnDate =
    txns.length > 0
      ? txns.map((t) => t.date).sort((a, b) => a.localeCompare(b))[0]
      : null;

  const stockMap = new Map(stocks.map((s) => [s.symbol, s]));
  const totalNow = series.length ? series[series.length - 1].value : 0;

  const periods: PeriodPerformance[] = [];
  const breakdown: Record<string, HoldingPeriod[]> = {};

  for (const { label, months } of MONTHS) {
    const wanted = monthsAgo(months);
    const sinceInception = !!firstTxnDate && firstTxnDate > wanted;
    const startDate = sinceInception ? firstTxnDate! : wanted;
    const fromIdx = indexOnOrAfter(axis, startDate);
    const toIdx = axis.length - 1;

    const startValue = series[fromIdx]?.value ?? 0;
    const endValue = series[toIdx]?.value ?? 0;
    let netInvested = 0;
    for (let i = fromIdx + 1; i <= toIdx; i++) netInvested += series[i].flow;

    periods.push({
      label,
      months,
      startDate: axis[fromIdx] ?? startDate,
      endDate: axis[toIdx] ?? iso(new Date()),
      startValue,
      endValue,
      netInvested,
      gain: endValue - startValue - netInvested,
      portfolioReturn: twr(series, fromIdx, toIdx),
      benchmarkReturn: periodReturn(bench, axis[fromIdx] ?? startDate),
      benchmarkName: BENCHMARK_NAME,
      sinceInception,
    });

    // Per-stock breakdown for this window
    const bmk = periodReturn(bench, axis[fromIdx] ?? startDate);
    const rows: HoldingPeriod[] = [];
    for (const s of symbols) {
      const pts = hist.get(s) ?? [];
      const pr = periodReturn(pts, axis[fromIdx] ?? startDate);
      const meta = stockMap.get(s);

      // Rupee contribution: value change minus money put in for this stock.
      const sTxns = txns.filter((t) => t.symbol === s);
      const unitsAt = (d: string) =>
        sTxns
          .filter((t) => t.date <= d)
          .reduce((u, t) => u + (t.type === "BUY" ? t.units : -t.units), 0);
      const priceMap = toMap(pts);
      const priceAt = (d: string) => {
        const inRange = pts.filter((p) => p.date <= d);
        return priceMap.get(d) ?? inRange[inRange.length - 1]?.close ?? null;
      };
      const startD = axis[fromIdx];
      const endD = axis[toIdx];
      const u0 = unitsAt(startD),
        u1 = unitsAt(endD);
      const p0 = priceAt(startD),
        p1 = priceAt(endD);
      const flowIn = sTxns
        .filter((t) => t.date > startD && t.date <= endD)
        .reduce((f, t) => f + (t.type === "BUY" ? t.units * t.price : -t.units * t.price), 0);
      const contribution =
        p0 != null && p1 != null ? u1 * p1 - u0 * p0 - flowIn : 0;

      rows.push({
        symbol: s,
        name: meta?.name ?? s,
        sector: meta?.sector ?? "Other",
        priceReturn: pr,
        vsBenchmark: pr != null && bmk != null ? pr - bmk : null,
        contribution,
        weight:
          totalNow > 0 && meta?.price != null
            ? (unitsAt(endD) * meta.price) / totalNow
            : 0,
        held: u1 > 1e-9,
      });
    }
    rows.sort((a, b) => b.contribution - a.contribution);
    breakdown[label] = rows;
  }

  return { periods, breakdown, series, benchmarkSeries: bench, firstTxnDate };
}
